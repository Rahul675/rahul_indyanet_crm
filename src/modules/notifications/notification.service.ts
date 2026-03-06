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
      include: { loadshare: { include: { cluster: true } } },
    });

    let created = 0;
    for (const r of recharges) {
      const expired = isBefore(r.expiryDate, now);
      const type = expired ? "Recharge Expired" : "Recharge Expiry Soon";
      // Skip if a notification for this recharge and type already exists
      const exists = await this.prisma.notification.findFirst({
        where: { rechargeId: r.id, type },
      });
      if (exists) continue;

      const clusterName = r.loadshare?.cluster?.name || "Unknown Cluster";
      const location = r.loadshare?.nameOfLocation || "Unknown Location";

      if (expired) {
        await this.createNotification(
          type,
          `Recharge for ${clusterName} (${location}) expired on ${r.expiryDate.toDateString()}.`,
          undefined,
          r.id
        );
        created++;
      } else {
        await this.createNotification(
          type,
          `Recharge for ${clusterName} (${location}) will expire on ${r.expiryDate.toDateString()}.`,
          undefined,
          r.id
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

  // ---------------------------------------------------------------------------------
  // 🔍 DEBUG METHODS - For troubleshooting the notification system
  // ---------------------------------------------------------------------------------

  /**
   * 📊 Debug: Get system statistics
   */
  async getDebugStats() {
    try {
      const total = await this.prisma.notification.count();
      const unread = await this.prisma.notification.count({
        where: { read: false },
      });
      const read = await this.prisma.notification.count({
        where: { read: true },
      });

      const byType = await this.prisma.notification.groupBy({
        by: ['type'],
        _count: true,
      });

      const withUserId = await this.prisma.notification.count({
        where: { userId: { not: null } },
      });

      const withRechargeId = await this.prisma.notification.count({
        where: { rechargeId: { not: null } },
      });

      return {
        success: true,
        timestamp: new Date(),
        stats: {
          totalNotifications: total,
          unreadCount: unread,
          readCount: read,
          withUserIdCount: withUserId,
          withRechargeIdCount: withRechargeId,
          notificationsByType: byType,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting debug stats: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 📜 Debug: Get recent notifications
   */
  async getRecentNotifications(limit = 20) {
    try {
      const notifications = await this.prisma.notification.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        timestamp: new Date(),
        count: notifications.length,
        data: notifications,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching recent notifications: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 🧪 Debug: Test notification creation
   */
  async testCreateNotification(testUserId?: string) {
    try {
      const testMessage = `[DEBUG TEST] Created at ${new Date().toISOString()}`;

      this.logger.log(`[DEBUG] Creating test notification...`);

      const result = await this.createNotification(
        'DEBUG_TEST_NOTIFICATION',
        testMessage,
        testUserId,
        undefined
      );

      this.logger.log(`[DEBUG] Test notification created successfully:`, {
        id: result.id,
        type: result.type,
        userId: result.userId,
        read: result.read,
      });

      return {
        success: true,
        timestamp: new Date(),
        message: 'Test notification created successfully',
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[DEBUG] Error creating test notification: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 🔍 Debug: Verify notification persistence
   */
  async verifyPersistence(notificationId: string) {
    try {
      this.logger.log(`[DEBUG] Verifying notification: ${notificationId}`);

      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        return {
          success: false,
          error: `Notification ${notificationId} not found`,
          timestamp: new Date(),
        };
      }

      return {
        success: true,
        timestamp: new Date(),
        data: notification,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error verifying persistence: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 🏥 Debug: Full health check
   */
  async healthCheck() {
    try {
      const dbTest = await this.prisma.$queryRaw`SELECT 1 as test`;
      const total = await this.prisma.notification.count();

      return {
        success: true,
        timestamp: new Date(),
        health: {
          database: 'connected',
          notificationCount: total,
          status: 'healthy',
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Health check failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        health: { status: 'unhealthy' },
      };
    }
  }
}
