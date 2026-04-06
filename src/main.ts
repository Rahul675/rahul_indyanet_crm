import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConsoleLogger, ValidationPipe, type LogLevel } from "@nestjs/common";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter"; // ✅ Import
import type { NextFunction, Request, Response } from "express";
import { csrfProtectionMiddleware } from "./common/security/csrf.middleware";

class FilteredNestLogger extends ConsoleLogger {
  private readonly allowedLogContexts: Set<string>;

  constructor(allowedContexts: string[], logLevels: LogLevel[]) {
    super("Bootstrap", { logLevels });
    this.allowedLogContexts = new Set(allowedContexts);
  }

  override log(message: any, context?: string) {
    if (!context || this.allowedLogContexts.has(context)) {
      super.log(message, context);
    }
  }
}

function parseTrustProxy(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === "true") return true;
  if (normalized === "false") return false;

  const hopCount = Number(normalized);
  if (Number.isInteger(hopCount) && hopCount >= 0) {
    return hopCount;
  }

  if (
    normalized === "loopback" ||
    normalized === "linklocal" ||
    normalized === "uniquelocal"
  ) {
    return normalized;
  }

  return value;
}

function parseOrigins(value?: string) {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseNestLogLevels(value?: string): LogLevel[] {
  const allowed: LogLevel[] = ["log", "error", "warn", "debug", "verbose", "fatal"];
  const defaults: LogLevel[] = ["error", "warn", "log"];

  if (!value || !value.trim()) {
    return defaults;
  }

  const parsed = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is LogLevel => allowed.includes(item as LogLevel));

  return parsed.length > 0 ? parsed : defaults;
}

// ✅ Validate required environment variables
function validateEnv() {
  const required = ["DATABASE_URL", "JWT_SECRET", "FRONTEND_URL"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `❌ Missing required environment variables: ${missing.join(", ")}`
    );
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    // process.exit(1);
  }

   console.log("✅ Environment variables validated");
}

async function bootstrap() {
  validateEnv();

  const frontendOrigins = parseOrigins(process.env.FRONTEND_URL);
  const allowLocalDevCors =
    process.env.ALLOW_LOCALHOST_CORS === "true" ||
    process.env.NODE_ENV !== "production";
  const localOrigins = ["http://localhost:5173", "http://localhost:3000"];
  const allowedOrigins = Array.from(
    new Set([
      ...frontendOrigins,
      ...(allowLocalDevCors ? localOrigins : []),
    ])
  );

  const trustProxy =
    process.env.TRUST_PROXY !== undefined
      ? parseTrustProxy(process.env.TRUST_PROXY)
      : process.env.NODE_ENV === "production"
      ? 1
      : false;
  const nestLogLevels = parseNestLogLevels(process.env.NEST_LOG_LEVELS);
  const nestLogger = new FilteredNestLogger(
    ["PrismaService", "NestApplication", "MailerService"],
    nestLogLevels
  );

  // ✅ Configure CORS properly
  const app = await NestFactory.create(AppModule, {
    logger: nestLogger,
  });

  // Browsers often auto-request /favicon.ico; return empty response to avoid noisy 404 logs.
  app.use("/favicon.ico", (_req: Request, res: Response) => {
    res.status(204).end();
  });

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Allow non-browser clients and same-origin server-to-server calls.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  });

  // ✅ Set global prefix for API versioning
  app.setGlobalPrefix("api/v1");
  app.getHttpAdapter().getInstance().set("trust proxy", trustProxy);

  console.log(`🔐 Trust proxy: ${JSON.stringify(trustProxy)}`);
  console.log(`🪵 Nest log levels: ${nestLogLevels.join(", ")}`);
  console.log(
    `🌐 CORS allowed origins: ${allowedOrigins.length ? allowedOrigins.join(", ") : "(none)"}`
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=()"
    );
    return csrfProtectionMiddleware(req, res, next);
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true, // ✅ Reject unknown fields
      transform: true,
      forbidUnknownValues: true,
      stopAtFirstError: true,
      validationError: {
        target: false,
        value: false,
      },
    })
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter()); // ✅ Add global exception filter

  const port = process.env.PORT || 9000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}/api/v1`);
}
bootstrap();
