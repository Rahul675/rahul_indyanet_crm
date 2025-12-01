import { Controller, Get } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // 📊 Main endpoint for frontend dashboard
  @Get()
  async getSummary() {
    return this.dashboardService.getDashboardSummary();
  }

  // Optional: individual endpoints
  @Get("customers")
  getCustomerStats() {
    return this.dashboardService.getCustomerStats();
  }

  @Get("renewals")
  getRenewals() {
    return this.dashboardService.getRenewals();
  }

  @Get("installations")
  getNewInstallations() {
    return this.dashboardService.getNewInstallations();
  }

  @Get("suspensions")
  getSuspensions() {
    return this.dashboardService.getSuspensions();
  }

  @Get("deactivations")
  getDeactivations() {
    return this.dashboardService.getDeactivations();
  }

  @Get("active-users")
  getActiveUsers() {
    return this.dashboardService.getActiveCRMUsers();
  }
}
