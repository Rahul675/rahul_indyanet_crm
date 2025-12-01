import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { subDays, startOfMonth } from "date-fns";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // 🟢 Total Customers
  async getCustomerStats() {
    const total = await this.prisma.customer.count();
    const active = await this.prisma.customer.count({
      where: { connectionStatus: "Active" },
    });
    const inactive = total - active;

    return { total, active, inactive };
  }

  // 🟢 Renewals (customers recharged this month)
  async getRenewals() {
    const start = startOfMonth(new Date());
    const count = await this.prisma.recharge.count({
      where: { rechargeDate: { gte: start } },
    });
    return { renewals: count };
  }

  // 🟢 New Installations (new customers this month)
  async getNewInstallations() {
    const start = startOfMonth(new Date());
    const count = await this.prisma.customer.count({
      where: { installDate: { gte: start } },
    });
    return { newInstallations: count };
  }

  // 🟢 Suspensions
  async getSuspensions() {
    const count = await this.prisma.customer.count({
      where: { connectionStatus: "Suspended" },
    });
    return { suspensions: count };
  }

  // 🟢 Deactivations
  async getDeactivations() {
    const count = await this.prisma.customer.count({
      where: { connectionStatus: "Deactivated" },
    });
    return { deactivations: count };
  }

  // 🟢 Currently active users on CRM
  async getActiveCRMUsers() {
    const activeUsers = await this.prisma.user.count({
      where: {
        OR: [
          { isOnline: true },
          { lastActiveAt: { gte: subDays(new Date(), 1) } }, // seen within last 24h
        ],
      },
    });
    return { activeCRMUsers: activeUsers };
  }

  // 🟢 Combine all metrics into one summary
  async getDashboardSummary() {
    const [
      customerStats,
      renewals,
      newInstalls,
      suspensions,
      deactivations,
      activeCRM,
    ] = await Promise.all([
      this.getCustomerStats(),
      this.getRenewals(),
      this.getNewInstallations(),
      this.getSuspensions(),
      this.getDeactivations(),
      this.getActiveCRMUsers(),
    ]);

    return {
      success: true,
      timestamp: new Date(),
      data: {
        ...customerStats,
        ...renewals,
        ...newInstalls,
        ...suspensions,
        ...deactivations,
        ...activeCRM,
      },
    };
  }
}
