import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // ✅ Force load .env from root (important when running from dist/)
    dotenv.config({ path: path.resolve(process.cwd(), ".env") });

    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      // console.error("❌ DATABASE_URL not found in .env file!");
      throw new Error("DATABASE_URL is missing");
    }

    super({
      datasources: {
        db: { url: dbUrl },
      },
      log: [
        { emit: "event", level: "query" },
        { emit: "stdout", level: "error" },
        { emit: "stdout", level: "warn" },
      ],
    });

    // 👇 Log queries only in development
    // if (process.env.NODE_ENV !== "production") {
    //   (this as any).$on("query", (event: Prisma.QueryEvent) => {
    //     this.logger.debug(
    //       `🟢 Prisma Query: ${event.query} — Params: ${event.params}`
    //     );
    //   });
    // }
  }

  // 🟢 Connect to the database with retry logic
  async onModuleInit() {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await this.$connect();
        this.logger.log("✅ Connected to the database successfully!");
        break;
      } catch (error) {
        retries++;
        this.logger.error(
          `Database connection failed (Attempt ${retries}/${maxRetries})`,
          (error as Error).message
        );
        if (retries === maxRetries) throw error;
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
  }

  // 🔴 Gracefully disconnect on shutdown
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.warn("⚠️ Database connection closed.");
  }

  // 🧹 Optional utility for clearing tables during tests or dev
  async cleanDatabase() {
    const modelNames = Object.keys(this).filter((key) => {
      const val = (this as any)[key];
      return val && typeof val.deleteMany === "function";
    });

    for (const model of modelNames) {
      try {
        await (this as any)[model].deleteMany();
      } catch (err) {
        this.logger.warn(`⚠️ Skipped model: ${model}`);
      }
    }

    this.logger.warn("🧹 Database cleaned successfully (dev/test mode).");
  }
}
