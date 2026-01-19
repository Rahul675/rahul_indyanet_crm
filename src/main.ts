import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter"; // ✅ Import

// ✅ Validate required environment variables
function validateEnv() {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `❌ Missing required environment variables: ${missing.join(", ")}`
    );
    process.exit(1);
  }

  console.log("✅ Environment variables validated");
}

async function bootstrap() {
  validateEnv();

  // ✅ Configure CORS properly
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? ["https://crm.indyanet.com"] // ✅ Restrict to your domain
          : ["http://localhost:5173", "http://localhost:3000"], // Dev origins
      credentials: true,
    },
  });

  // ✅ Set global prefix for API versioning
  app.setGlobalPrefix("api/v1");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true, // ✅ Reject unknown fields
      transform: true,
    })
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter()); // ✅ Add global exception filter

  const port = process.env.PORT || 9000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}/api/v1`);
}
bootstrap();
