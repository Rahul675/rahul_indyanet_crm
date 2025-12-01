import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CustomerStatusScheduler {
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deactivateExpiredCustomers() {
    await this.prisma.customer.updateMany({
      where: { expiryDate: { lt: new Date() }, connectionStatus: "Active" },
      data: { connectionStatus: "Inactive" },
    });
    console.log("✅ Deactivated expired customers at midnight");
  }
}
