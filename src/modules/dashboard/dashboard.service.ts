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

  // 🟢 Total Issues (Open & Resolved)
  async getIssuesMetrics() {
    const total = await this.prisma.issue.count();
    const open = await this.prisma.issue.count({
      where: { status: "Open" },
    });
    const resolved = await this.prisma.issue.count({
      where: { status: "Resolved" },
    });
    return { totalIssues: total, openIssues: open, resolvedIssues: resolved };
  }

  // 🟢 Monthly Revenue (this month)
  async getMonthlyRevenue() {
    const start = startOfMonth(new Date());
    const recharges = await this.prisma.recharge.aggregate({
      where: { rechargeDate: { gte: start } },
      _sum: { amount: true },
    });
    return { monthlyRevenue: recharges._sum.amount || 0 };
  }

  // 🟢 Top Cluster by loadshares
  async getTopCluster() {
    const topCluster = await this.prisma.loadShare.groupBy({
      by: ["clusterId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 1,
    });

    if (topCluster.length === 0) {
      return { topCluster: "N/A", topClusterCount: 0 };
    }

    const cluster = await this.prisma.cluster.findUnique({
      where: { id: topCluster[0].clusterId },
      select: { name: true },
    });

    return {
      topCluster: cluster?.name || "Unknown",
      topClusterCount: topCluster[0]._count.id,
    };
  }

  // 🟢 Issue Resolution Efficiency
  async getResolutionRate() {
    const total = await this.prisma.issue.count();
    const resolved = await this.prisma.issue.count({
      where: { status: "Resolved" },
    });
    const rate = total === 0 ? 0 : Math.round((resolved / total) * 100);
    return { issueResolutionRate: rate };
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
      issues,
      revenue,
      topCluster,
      resolutionRate,
    ] = await Promise.all([
      this.getCustomerStats(),
      this.getRenewals(),
      this.getNewInstallations(),
      this.getSuspensions(),
      this.getDeactivations(),
      this.getActiveCRMUsers(),
      this.getIssuesMetrics(),
      this.getMonthlyRevenue(),
      this.getTopCluster(),
      this.getResolutionRate(),
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
        ...issues,
        ...revenue,
        ...topCluster,
        ...resolutionRate,
      },
    };
  }
}
