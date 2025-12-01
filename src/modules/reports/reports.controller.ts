import { Controller, Get, Query } from "@nestjs/common";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // 📊 Combined Summary
  @Get()
  async getSummary() {
    return {
      success: true,
      timestamp: new Date(),
      data: await this.reportsService.getReportsSummary(),
    };
  }

  // 📈 Customer stats
  @Get("customers")
  async getCustomerStats() {
    return {
      success: true,
      timestamp: new Date(),
      data: await this.reportsService.getCustomerStats(),
    };
  }

  // 🧾 Issues trend
  @Get("issues")
  async getIssuesTrend() {
    return {
      success: true,
      timestamp: new Date(),
      data: await this.reportsService.getIssuesTrend(),
    };
  }

  // 💰 Revenue Report
  @Get("revenue")
  async getRevenue(@Query("range") range: "day" | "week" | "month" = "month") {
    return {
      success: true,
      timestamp: new Date(),
      data: await this.reportsService.getRevenueReport(range),
    };
  }
}
