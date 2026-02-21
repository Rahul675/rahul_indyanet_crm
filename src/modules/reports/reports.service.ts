import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { subDays, startOfWeek, startOfMonth } from "date-fns";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // 🔹 1️⃣ Customer Stats
  async getCustomerStats() {
    const [active, inactive] = await Promise.all([
      this.prisma.customer.count({ where: { connectionStatus: "Active" } }),
      this.prisma.customer.count({ where: { connectionStatus: "Inactive" } }),
    ]);
    return { active, inactive };
  }

  // 🔹 2️⃣ Issues Trend (by month)
  async getIssuesTrend() {
    const issues = await this.prisma.issue.findMany({
      select: { createdDate: true },
      orderBy: { createdDate: "asc" },
    });

    const monthly = issues.reduce((acc, issue) => {
      const month = issue.createdDate.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthly).map(([month, issues]) => ({
      month,
      issues,
    }));
  }

  // 🔹 2️⃣b Customer Growth (by month)
  async getCustomerGrowth() {
    const customers = await this.prisma.customer.findMany({
      select: { installDate: true },
      orderBy: { installDate: "asc" },
    });

    const monthly = customers.reduce((acc, customer) => {
      if (!customer.installDate) return acc;
      const month = customer.installDate.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthly).map(([month, customers]) => ({
      month,
      customers,
    }));
  }

  // 🔹 3️⃣ Revenue Report (day / week / month)
  async getRevenueReport(range: "day" | "week" | "month" = "month") {
    const now = new Date();
    let start: Date;

    if (range === "day") start = subDays(now, 1);
    else if (range === "week") start = startOfWeek(now, { weekStartsOn: 1 });
    else start = startOfMonth(now);

    const recharges = await this.prisma.recharge.findMany({
      where: { rechargeDate: { gte: start, lte: now } },
      select: { rechargeDate: true, amount: true },
      orderBy: { rechargeDate: "asc" },
    });

    const grouped: Record<string, number> = {};

    recharges.forEach((r) => {
      const key =
        range === "day"
          ? r.rechargeDate.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : range === "week"
          ? r.rechargeDate.toLocaleDateString("en-GB", { weekday: "short" })
          : r.rechargeDate.toLocaleDateString("en-GB", { day: "2-digit" });

      grouped[key] = (grouped[key] || 0) + r.amount;
    });

    const data = Object.entries(grouped).map(([label, amount]) => ({
      label,
      amount,
    }));
    const total = recharges.reduce((sum, r) => sum + r.amount, 0);

    return { range, total, data };
  }

  // 🔹 Combined summary
  async getReportsSummary() {
    const [customerStats, issuesTrend, customerGrowth, revenueMonth] =
      await Promise.all([
      this.getCustomerStats(),
      this.getIssuesTrend(),
      this.getCustomerGrowth(),
      this.getRevenueReport("month"),
    ]);
    return { customerStats, issuesTrend, customerGrowth, revenueMonth };
  }
}
