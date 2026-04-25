import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { MailerService } from "../../mailers/mailer.services";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { createHash, randomBytes } from "crypto";

const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const PASSWORD_RESET_GENERIC_MESSAGE =
  "If an account exists with that email, a password reset link has been sent.";
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_DAYS = 30;

type RateLimitBucket = {
  count: number;
  resetAt: number;
  blockedUntil?: number;
};

@Injectable()
export class AuthService {
  private readonly rateLimiter = new Map<string, RateLimitBucket>();

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationService,
    private jwtService: JwtService,
    private mailer: MailerService
  ) {}

  private getClientKey(ip?: string) {
    return (ip || "unknown").trim().toLowerCase();
  }

  private enforceRateLimit(
    scope: "login" | "forgot" | "reset" | "refresh",
    key: string,
    limit: number,
    windowMs: number = AUTH_RATE_LIMIT_WINDOW_MS
  ) {
    const now = Date.now();
    const bucketKey = `${scope}:${key}`;
    const existing = this.rateLimiter.get(bucketKey);

    if (existing?.blockedUntil && existing.blockedUntil > now) {
      throw new HttpException(
        "Too many requests. Please try again later.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    if (!existing || existing.resetAt <= now) {
      this.rateLimiter.set(bucketKey, {
        count: 1,
        resetAt: now + windowMs,
      });
      return;
    }

    existing.count += 1;
    if (existing.count > limit) {
      existing.blockedUntil = now + windowMs;
      this.rateLimiter.set(bucketKey, existing);
      throw new HttpException(
        "Too many requests. Please try again later.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    this.rateLimiter.set(bucketKey, existing);
  }

  private getRefreshSecret() {
    return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private getRefreshExpiry() {
    return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  }

  private issueAuthTokens(user: { id: string; email: string; role: string }) {
    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: "access" as const,
    };

    const refreshPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: "refresh" as const,
      jti: randomBytes(16).toString("hex"),
    };

    const accessToken = this.jwtService.sign(accessPayload);
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
      secret: this.getRefreshSecret(),
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async createRefreshSession(userId: string, refreshToken: string) {
    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: this.getRefreshExpiry(),
      },
    });
  }

  private async revokeAllRefreshSessions(userId: string) {
    await this.prisma.refreshSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async getRefreshSessions(userId: string) {
    const sessions = await this.prisma.refreshSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    return sessions.map((session) => ({
      ...session,
      status:
        session.revokedAt
          ? "revoked"
          : session.expiresAt <= new Date()
          ? "expired"
          : "active",
    }));
  }

  async revokeRefreshSession(userId: string, sessionId: string) {
    if (!sessionId) {
      throw new BadRequestException("Session ID is required.");
    }

    const session = await this.prisma.refreshSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new UnauthorizedException("Session not found.");
    }

    if (session.revokedAt) {
      return {
        success: true,
        message: "Session already revoked.",
      };
    }

    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return {
      success: true,
      message: "Session revoked successfully.",
    };
  }

  async register(
    name: string,
    email: string,
    password: string,
    role: string = "operator"
  ) {
    if (!name || !email || !password)
      throw new BadRequestException("All fields are required.");

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw new UnauthorizedException("User already exists.");

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: { name, email: normalizedEmail, password: hashedPassword, role },
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

  async login(email: string, password: string, clientIp?: string) {
    if (!email || !password)
      throw new BadRequestException("Email and password are required.");

    const normalizedEmail = email.trim().toLowerCase();
    const clientKey = this.getClientKey(clientIp);

    this.enforceRateLimit("login", clientKey, 25);
    this.enforceRateLimit("login", `${clientKey}:${normalizedEmail}`, 8);

    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) throw new UnauthorizedException("Invalid credentials.");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException("Invalid credentials.");

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastLoginAt: new Date(), lastActiveAt: new Date() },
    });

    const { accessToken, refreshToken } = this.issueAuthTokens(user);
    await this.createRefreshSession(user.id, refreshToken);

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

  async refresh(refreshToken?: string, clientIp?: string) {
    if (!refreshToken) {
      throw new BadRequestException("Refresh token is required.");
    }

    const clientKey = this.getClientKey(clientIp);
    this.enforceRateLimit("refresh", clientKey, 60);

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.getRefreshSecret(),
      });
    } catch (e) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    if (payload?.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    const tokenHash = this.hashToken(refreshToken);
    const existingSession = await this.prisma.refreshSession.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!existingSession) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    await this.prisma.refreshSession.update({
      where: { id: existingSession.id },
      data: { revokedAt: new Date() },
    });

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      this.issueAuthTokens(user);
    await this.createRefreshSession(user.id, newRefreshToken);

    await this.audit.logAction(
      user.id,
      "TOKEN_REFRESH",
      "User",
      `${user.name} refreshed access token`
    );

    return {
      success: true,
      message: "Token refreshed successfully",
      token: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logoutByRefreshToken(refreshToken?: string, reason?: string) {
    if (!refreshToken) {
      return {
        success: true,
        message: "Logout successful",
      };
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.getRefreshSecret(),
      });
    } catch {
      return {
        success: true,
        message: "Logout successful",
      };
    }

    if (payload?.type !== "refresh" || !payload?.sub) {
      return {
        success: true,
        message: "Logout successful",
      };
    }

    return this.logout(payload.sub, reason);
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
        lastActiveAt: new Date(),
        lastLogoutAt: new Date(),
        logoutReason: reason || null,
      },
    });

    await this.revokeAllRefreshSessions(user.id);

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
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isOnline: true,
        lastActiveAt: true,
        lastLoginAt: true,
        lastLogoutAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const clusters = await this.prisma.cluster.findMany({
      select: { id: true, assignedOperators: true },
    });

    const clusterMap = new Map<string, string[]>();
    for (const cluster of clusters) {
      for (const operatorId of cluster.assignedOperators || []) {
        const current = clusterMap.get(operatorId) || [];
        current.push(cluster.id);
        clusterMap.set(operatorId, current);
      }
    }

    return users.map((user) => ({
      ...user,
      assignedClusters: clusterMap.get(user.id) || [],
    }));
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isOnline: true,
        lastActiveAt: true,
        lastLoginAt: true,
        lastLogoutAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    const clusters = await this.prisma.cluster.findMany({
      select: { id: true, assignedOperators: true },
    });

    const assignedClusters = clusters
      .filter((cluster) => (cluster.assignedOperators || []).includes(user.id))
      .map((cluster) => cluster.id);

    return {
      ...user,
      assignedClusters,
    };
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

  async forgotPassword(email: string, clientIp?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const clientKey = this.getClientKey(clientIp);

    this.enforceRateLimit("forgot", clientKey, 20);
    this.enforceRateLimit("forgot", `${clientKey}:${normalizedEmail}`, 5);

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return {
        success: true,
        message: PASSWORD_RESET_GENERIC_MESSAGE,
      };
    }

    const resetToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(resetToken).digest("hex");
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendBaseUrl}/reset-password?token=${encodeURIComponent(
      resetToken
    )}`;

    const subject = "Reset your Indyanet CRM password";
    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2 style="margin:0 0 8px;">Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>We received a request to reset your password.</p>
        <p>This link will expire in 15 minutes.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 14px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">
            Reset Password
          </a>
        </p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>
        <p style="color:#666; font-size:12px;">This is an automated message from Indyanet CRM.</p>
      </div>
    `;

    await this.mailer.send(user.email, subject, html);

    await this.audit.logAction(
      user.id,
      "FORGOT_PASSWORD_REQUEST",
      "User",
      `${user.name} requested a password reset link`
    );

    return {
      success: true,
      message: PASSWORD_RESET_GENERIC_MESSAGE,
    };
  }

  async resetPassword(dto: ResetPasswordDto, clientIp?: string) {
    const { token, newPassword, confirmPassword } = dto;

    const clientKey = this.getClientKey(clientIp);
    this.enforceRateLimit("reset", clientKey, 30);

    if (newPassword !== confirmPassword) {
      throw new BadRequestException("New password and confirm password do not match.");
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const resetRecord = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!resetRecord) {
      throw new BadRequestException("Invalid or expired reset token.");
    }

    const isSameAsCurrent = await bcrypt.compare(newPassword, resetRecord.user.password);
    if (isSameAsCurrent) {
      throw new BadRequestException("New password must be different from the current password.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: resetRecord.userId,
          usedAt: null,
        },
        data: { usedAt: now },
      }),
      this.prisma.refreshSession.updateMany({
        where: {
          userId: resetRecord.userId,
          revokedAt: null,
        },
        data: { revokedAt: now },
      }),
    ]);

    await this.audit.logAction(
      resetRecord.userId,
      "RESET_PASSWORD",
      "User",
      `${resetRecord.user.name} reset password via forgot-password flow`
    );

    await this.notifications.createNotification(
      "Password Reset",
      `Your password was reset on ${now.toLocaleString()}. If this was not you, contact admin immediately.`,
      resetRecord.userId
    );

    return {
      success: true,
      message: "Password reset successful. You can now log in with your new password.",
    };
  }
}
