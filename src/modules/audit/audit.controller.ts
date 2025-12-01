import { Controller, Get, Delete, Param } from "@nestjs/common";
import { AuditService } from "./audit.service";

@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // 🧾 Fetch all logs
  @Get()
  async getAll() {
    return this.auditService.getAll();
  }

  // 🧍 Fetch logs for specific user
  @Get("user/:userId")
  async getByUser(@Param("userId") userId: string) {
    return this.auditService.getUserLogs(userId);
  }

  // 🧹 Clear logs
  @Delete("clear")
  async clearAll() {
    return this.auditService.clearAll();
  }
}
