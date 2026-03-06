import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Delete,
  Query,
} from "@nestjs/common";
import { NotificationService } from "./notification.service";

@Controller("notifications")
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  // 🔔 Create notification manually (optional)
  @Post()
  async create(
    @Body()
    body: {
      type: string;
      message: string;
      userId?: string;
      rechargeId?: string;
    }
  ) {
    const data = await this.notificationService.createNotification(
      body.type,
      body.message,
      body.userId,
      body.rechargeId
    );
    return { success: true, timestamp: new Date(), data };
  }

  // 📬 Get unread notifications
  @Get("unread")
  async getUnread(@Query("userId") userId?: string) {
    return this.notificationService.getUnread(userId);
  }

  // 📜 Get all notifications
  @Get()
  async getAll(@Query("userId") userId?: string) {
    return this.notificationService.getAll(userId);
  }

  // ✅ Mark notification as read
  @Post(":id/read")
  async markAsRead(@Param("id") id: string) {
    return this.notificationService.markAsRead(id);
  }

  // 🧹 Clear all notifications
  @Delete("clear")
  async clearAll(@Query("userId") userId?: string) {
    return this.notificationService.clearAll(userId);
  }

  // ⏰ Manual trigger for expiry check
  @Get("check-expiry")
  async triggerExpiryCheck() {
    return this.notificationService.checkRechargesForExpiry();
  }

  // =====================================================================
  // 🔧 DEBUG ENDPOINTS - For troubleshooting
  // =====================================================================

  // 🔍 Get system statistics
  @Get("debug/stats")
  async debugGetStats() {
    return this.notificationService.getDebugStats();
  }

  // 📜 Get recent notifications
  @Get("debug/recent")
  async debugGetRecent(@Query("limit") limit?: string) {
    const limitNum = parseInt(limit || "20", 10);
    return this.notificationService.getRecentNotifications(limitNum);
  }

  // 🧪 Create test notification
  @Post("debug/test")
  async debugTestNotification(@Query("userId") userId?: string) {
    return this.notificationService.testCreateNotification(userId);
  }

  // 🔍 Verify specific notification
  @Get("debug/verify/:id")
  async debugVerify(@Param("id") id: string) {
    return this.notificationService.verifyPersistence(id);
  }

  // 🏥 Full health check
  @Get("debug/health")
  async debugHealthCheck() {
    return this.notificationService.healthCheck();
  }
}
