import { Body, Controller, Get, Param, Post, UseGuards, Req } from "@nestjs/common";
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

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.name, dto.email, dto.password, dto.role);
  }

  @Post("login")
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post("logout")
  @UseGuards(AuthGuard("jwt"))
  async logout(@Req() req: any, @Body() dto: LogoutDto) {
    return this.auth.logout(req.user.id, dto.reason);
  }

  @Get("users")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "operator")
  async getUsers() {
    return this.auth.getAllUsers();
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.id, dto);
  }

  @Post("refresh")
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }
}
