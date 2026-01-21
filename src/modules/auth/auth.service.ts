import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { MailerService } from "../../mailers/mailer.services";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationService,
    private jwtService: JwtService,
    private mailer: MailerService
  ) {}

  async register(
    name: string,
    email: string,
    password: string,
    role: string = "operator"
  ) {
    if (!name || !email || !password)
      throw new BadRequestException("All fields are required.");

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new UnauthorizedException("User already exists.");

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: { name, email, password: hashedPassword, role },
    });

    await this.audit.logAction(
      user.id,
      "CREATE_USER",
      "User",
      `New ${role} account created: ${user.name}`
    );

    await this.notifications.createNotification(
      "New User Account",
      `A new ${role} account was created: ${user.name}`,
      user.id
    );

    return {
      message: "User registered successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(email: string, password: string) {
    if (!email || !password)
      throw new BadRequestException("Email and password are required.");

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("Invalid credentials.");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException("Invalid credentials.");

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastLoginAt: new Date() },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: "30d" });

    await this.audit.logAction(
      user.id,
      "LOGIN",
      "User",
      `${user.name} logged in`
    );

    return {
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException("Refresh token is required.");
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch (e) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    const newAccessToken = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });

    await this.audit.logAction(
      user.id,
      "TOKEN_REFRESH",
      "User",
      `${user.name} refreshed access token`
    );

    return {
      success: true,
      token: newAccessToken,
    };
  }

  async logout(userId: string, reason?: string) {
    if (!userId) throw new BadRequestException("User ID is required.");

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found.");

    if (user.role === "operator" && (!reason || reason.trim().length < 30)) {
      throw new BadRequestException(
        "Operators must provide a reason of at least 30 characters before logging out."
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: false,
        lastLogoutAt: new Date(),
        logoutReason: reason || null,
      },
    });

    await this.audit.logAction(
      user.id,
      "LOGOUT",
      "User",
      reason
        ? `Logout reason: ${reason}`
        : `${user.name} (${user.role}) logged out`
    );

    return {
      message: "Logout successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isOnline: true,
        lastLoginAt: true,
        lastLogoutAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const { oldPassword, newPassword, confirmPassword } = dto;

    // Validate that new password and confirm password match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException("New password and confirm password do not match.");
    }

    // Validate new password is different from old password
    if (oldPassword === newPassword) {
      throw new BadRequestException("New password must be different from old password.");
    }

    // Find the user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException("Current password is incorrect.");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Log the action
    await this.audit.logAction(
      userId,
      "CHANGE_PASSWORD",
      "User",
      `${user.name} changed their password`
    );

    // Create notification
    await this.notifications.createNotification(
      "Password Changed",
      `Your password was successfully changed on ${new Date().toLocaleString()}`,
      userId
    );

    // Send email notification (only for operators)
    if (user.role === "operator") {
      const subject = "Your password has been changed";
      const html = `
        <div style="font-family: Arial, sans-serif; line-height:1.6;">
          <h2 style="margin:0 0 8px;">Password Change Confirmation</h2>
          <p>Hello ${user.name},</p>
          <p>This is to confirm that your password was changed on <strong>${new Date().toLocaleString()}</strong>.</p>
          <p>If you did not perform this change, please contact your administrator immediately.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>
          <p style="color:#666; font-size:12px;">This is an automated message from Indyanet CRM.</p>
        </div>
      `;
      await this.mailer.send(user.email, subject, html);
    }

    return {
      success: true,
      message: "Password changed successfully",
    };
  }
}
