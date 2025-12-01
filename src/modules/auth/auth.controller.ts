import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "@nestjs/passport";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
      role?: string;
    }
  ) {
    return this.auth.register(body.name, body.email, body.password, body.role);
  }

  @Post("login")
  async login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Post("logout/:userId")
  @UseGuards(AuthGuard("jwt"))
  async logout(
    @Param("userId") userId: string,
    @Body() body: { reason?: string }
  ) {
    return this.auth.logout(userId, body.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Get("users")
  @UseGuards(AuthGuard("jwt"))
  async getUsers() {
    return this.auth.getAllUsers();
  }
}
