import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CustomerStatusScheduler {
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deactivateExpiredCustomers() {
    // Note: Customer expiry logic has been moved to Recharge model
    // This scheduler is kept for future use or can be removed if not needed
    console.log("✅ Customer status scheduler running at midnight");
  }
}
