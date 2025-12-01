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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationService,
    private jwtService: JwtService
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
}
