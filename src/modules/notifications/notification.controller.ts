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
}
