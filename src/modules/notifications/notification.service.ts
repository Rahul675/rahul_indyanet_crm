import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { addDays, isBefore, isAfter } from "date-fns";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 🔔 Create a new notification
   */
  async createNotification(
    type: string,
    message: string,
    userId?: string,
    rechargeId?: string
  ) {
    return this.prisma.notification.create({
      data: { type, message, userId, rechargeId },
    });
  }

  /**
   * 📬 Fetch all unread notifications
   */
  async getUnread(userId?: string) {
    const data = await this.prisma.notification.findMany({
      where: { read: false, ...(userId ? { userId } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, timestamp: new Date(), count: data.length, data };
  }

  /**
   * 📜 Fetch all notifications
   */
  async getAll(userId?: string) {
    const data = await this.prisma.notification.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: "desc" },
    });
    return { success: true, timestamp: new Date(), count: data.length, data };
  }

  /**
   * ✅ Mark notification as read
   */
  async markAsRead(id: string) {
    const data = await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return { success: true, timestamp: new Date(), data };
  }

  /**
   * 🧹 Clear all notifications
   */
  async clearAll(userId?: string) {
    const deleted = await this.prisma.notification.deleteMany({
      where: userId ? { userId } : {},
    });
    return {
      success: true,
      timestamp: new Date(),
      message: `Cleared ${deleted.count} notifications.`,
    };
  }

  // ---------------------------------------------------------------------------------
  // 🚀 Advanced: Auto notifications for audit and recharges
  // ---------------------------------------------------------------------------------

  /**
   * 🧠 Create notifications from audit log events
   */
  async handleAuditEvent(
    action: string,
    entity: string,
    detail: string,
    userId?: string
  ) {
    const clean = detail?.toLowerCase() || "";

    if (entity === "Customer" && action === "CREATE_CUSTOMER") {
      return this.createNotification(
        "New Customer Added",
        detail || "A new customer has been added.",
        userId
      );
    }

    if (entity === "User" && action === "CREATE_USER") {
      return this.createNotification(
        "New User Account",
        detail || "A new user account was created.",
        userId
      );
    }

    if (entity === "Recharge" && action === "CREATE_RECHARGE") {
      return this.createNotification("Recharge Added", detail, userId);
    }

    if (entity === "Recharge" && clean.includes("expire")) {
      return this.createNotification("Recharge Expiry Update", detail, userId);
    }

    return null; // ignore unrelated actions
  }

  /**
   * ⏰ Check upcoming/expired recharges (for cron job)
   */
  async checkRechargesForExpiry() {
    const now = new Date();
    const weekAhead = addDays(now, 7);

    const recharges = await this.prisma.recharge.findMany({
      where: { expiryDate: { lte: weekAhead } },
      include: { customer: true },
    });

    let created = 0;
    for (const r of recharges) {
      if (isBefore(r.expiryDate, now)) {
        await this.createNotification(
          "Recharge Expired",
          `Recharge for ${
            r.customer.fullName
          } expired on ${r.expiryDate.toDateString()}.`
        );
        created++;
      } else if (isAfter(r.expiryDate, now)) {
        await this.createNotification(
          "Recharge Expiry Soon",
          `Recharge for ${
            r.customer.fullName
          } will expire on ${r.expiryDate.toDateString()}.`
        );
        created++;
      }
    }

    this.logger.log(`Expiry check complete: ${created} notifications created.`);
    return {
      success: true,
      timestamp: new Date(),
      message: `Created ${created} expiry notifications.`,
    };
  }
}
