import { Body, Controller, Delete, Get, Param, Post, Res, UseGuards, Req } from "@nestjs/common";
import { Response } from "express";
import { randomBytes } from "crypto";
import { Roles } from "./roles.decorator";
import { RolesGuard } from "./roles.guard";
import { AuthService } from "./auth.service";
import { AuthGuard } from "@nestjs/passport";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LoginDto } from "./dto/login.dto"; // ✅ Import DTOs
import { RegisterDto } from "./dto/register.dto";
import { LogoutDto } from "./dto/logout.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private readonly csrfCookieName = "csrf_token";

  private createCsrfToken() {
    return randomBytes(32).toString("hex");
  }

  private getCookieValue(req: any, name: string) {
    const rawCookie = req?.headers?.cookie;
    if (!rawCookie) return undefined;

    const pairs = rawCookie.split(";").map((part: string) => part.trim());
    for (const pair of pairs) {
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex === -1) continue;
      const key = pair.slice(0, separatorIndex).trim();
      if (key !== name) continue;
      return decodeURIComponent(pair.slice(separatorIndex + 1).trim());
    }

    return undefined;
  }

  private setAuthCookies(res: Response, token: string, refreshToken?: string) {
    const isProd = process.env.NODE_ENV === "production";
    const baseOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax" as const,
      path: "/api/v1",
    };

    res.cookie("access_token", token, {
      ...baseOptions,
      maxAge: 15 * 60 * 1000,
    });

    if (refreshToken) {
      res.cookie("refresh_token", refreshToken, {
        ...baseOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    res.cookie(this.csrfCookieName, this.createCsrfToken(), {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/api/v1",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private clearAuthCookies(res: Response) {
    const isProd = process.env.NODE_ENV === "production";
    const baseOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax" as const,
      path: "/api/v1",
    };

    res.clearCookie("access_token", baseOptions);
    res.clearCookie("refresh_token", baseOptions);
    res.clearCookie(this.csrfCookieName, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/api/v1",
    });
  }

  @Get("csrf-token")
  async getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === "production";
    const token = this.createCsrfToken();
    res.cookie(this.csrfCookieName, token, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/api/v1",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      csrfToken: token,
    };
  }

  private getClientIp(req: any) {
    const forwarded = req?.headers?.["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0]?.trim();
    }
    return req?.ip || req?.socket?.remoteAddress || "unknown";
  }

  @Post("register")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.name, dto.email, dto.password, dto.role);
  }

  @Post("login")
  async login(@Req() req: any, @Res({ passthrough: true }) res: Response, @Body() dto: LoginDto) {
    const result = await this.auth.login(dto.email, dto.password, this.getClientIp(req));
    this.setAuthCookies(res, result.token, result.refreshToken);
    return result;
  }

  @Post("logout")
  @UseGuards(AuthGuard("jwt"))
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response, @Body() dto: LogoutDto) {
    const result = await this.auth.logout(req.user.id, dto.reason);
    this.clearAuthCookies(res);
    return result;
  }

  @Get("users")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "operator")
  async getUsers() {
    return this.auth.getAllUsers();
  }

  @Get("profile")
  @UseGuards(AuthGuard("jwt"))
  async getProfile(@Req() req: any) {
    return this.auth.getProfile(req.user.id);
  }

  @Get("sessions")
  @UseGuards(AuthGuard("jwt"))
  async getSessions(@Req() req: any) {
    return this.auth.getRefreshSessions(req.user.id);
  }

  @Delete("sessions/:sessionId")
  @UseGuards(AuthGuard("jwt"))
  async revokeSession(@Req() req: any, @Param("sessionId") sessionId: string) {
    return this.auth.revokeRefreshSession(req.user.id, sessionId);
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.id, dto);
  }

  @Post("forgot-password")
  async forgotPassword(@Req() req: any, @Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email, this.getClientIp(req));
  }

  @Post("reset-password")
  async resetPassword(@Req() req: any, @Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto, this.getClientIp(req));
  }

  @Post("refresh")
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response, @Body() dto: RefreshDto) {
    const refreshFromCookie = this.getCookieValue(req, "refresh_token");
    const refreshToken = dto?.refreshToken || refreshFromCookie;
    const result = await this.auth.refresh(refreshToken, this.getClientIp(req));
    this.setAuthCookies(res, result.token, result.refreshToken);
    return result;
  }
}
