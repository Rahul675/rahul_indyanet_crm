import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config"; // ✅ Import ConfigService

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type?: "access" | "refresh";
  jti?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private static parseCookie(header: string | undefined, name: string) {
    if (!header) return null;
    const pairs = header.split(";").map((part) => part.trim());
    for (const pair of pairs) {
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex === -1) continue;
      const key = pair.slice(0, separatorIndex).trim();
      if (key !== name) continue;
      return decodeURIComponent(pair.slice(separatorIndex + 1).trim());
    }
    return null;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService // ✅ Inject ConfigService
  ) {
    const secret = config.getOrThrow<string>("JWT_SECRET");

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => JwtStrategy.parseCookie(req?.headers?.cookie, "access_token"),
      ]), // Read from Authorization header or HttpOnly cookie
      ignoreExpiration: false, // Reject expired tokens
      secretOrKey: secret, // ✅ Use .env, no fallback
    });
  }

  async validate(payload: JwtPayload) {
    if (payload?.type && payload.type !== "access") {
      throw new UnauthorizedException("Invalid or expired token.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isOnline: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid or expired token.");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
  }
}
