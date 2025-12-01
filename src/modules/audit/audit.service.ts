import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Record a system event or user action.
   */
  async logAction(
    userId: string | null,
    action: string,
    entity: string,
    detail?: string
  ) {
    return this.prisma.auditLog.create({
      data: { userId, action, entity, detail },
    });
  }

  /**
   * Retrieve all audit logs (latest first).
   */
  async getAll() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Retrieve audit logs for a specific user.
   */
  async getUserLogs(userId: string) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Clear all audit logs.
   */
  async clearAll() {
    await this.prisma.auditLog.deleteMany();
    return { message: "All audit logs cleared." };
  }
}
