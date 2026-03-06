import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { CreateIssueDto } from "./dto/create-issue.dto";
import { UpdateIssueDto } from "./dto/update-issue.dto";

@Injectable()
export class IssuesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationService
  ) {}

  async create(
    data: CreateIssueDto,
    user: { id: string; name: string; role: string }
  ) {
    // Validate cluster if provided
    if (data.clusterId) {
      const cluster = await this.prisma.cluster.findUnique({
        where: { id: data.clusterId },
      });
      if (!cluster) {
        throw new NotFoundException(`Cluster with ID ${data.clusterId} not found`);
      }
    }

    // Validate loadshare if provided
    if (data.loadshareId) {
      const loadshare = await this.prisma.loadShare.findUnique({
        where: { id: data.loadshareId },
      });
      if (!loadshare) {
        throw new NotFoundException(`Location with ID ${data.loadshareId} not found`);
      }
    }

    const issue = await this.prisma.issue.create({
      data: { 
        ...data, 
        createdDate: new Date() 
      },
      include: { 
        cluster: true,
        loadshare: true
      },
    });

    // 🔹 Issue log using same audit table
    await this.audit.logAction(
      user.id,
      "ISSUE_CREATE",
      "ISSUE",
      `Issue created at Cluster/Location by ${user.name} (${user.role})`
    );

    // 🔹 Notification
    await this.notifications.createNotification(
      "New Issue Created",
      `A new issue was raised`,
      user.id
    );

    return issue;
  }

  async findAll(clusterId?: string, loadshareId?: string) {
    const where: any = {};
    
    if (clusterId) {
      where.clusterId = clusterId;
    }
    
    if (loadshareId) {
      where.loadshareId = loadshareId;
    }
    
    return this.prisma.issue.findMany({
      where,
      orderBy: { createdDate: "desc" },
      include: { 
        cluster: true,
        loadshare: true
      },
    });
  }

  async findOne(id: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: { 
        cluster: true,
        loadshare: true
      },
    });

    if (!issue) throw new NotFoundException(`Issue with ID ${id} not found`);
    return issue;
  }

  async update(
    id: string,
    data: UpdateIssueDto,
    user: { id: string; name: string; role: string }
  ) {
    const existing = await this.prisma.issue.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Issue ${id} not found`);

    // If status is being changed to Resolved, capture the resolver
    let updateData = { ...data, updatedAt: new Date() };
    if (data.status === "Resolved" && existing.status !== "Resolved") {
      updateData = {
        ...updateData,
        resolvedBy: user.id,
        resolvedDate: new Date().toISOString(),
      };
    }

    const updated = await this.prisma.issue.update({
      where: { id },
      data: updateData,
      include: { 
        cluster: true,
        loadshare: true
      },
    });

    await this.audit.logAction(
      user.id,
      "ISSUE_UPDATE",
      "ISSUE",
      `Issue ${id} updated by ${user.name} (${user.role})`
    );

    return updated;
  }

  async remove(id: string, user: { id: string; name: string; role: string }) {
    const existing = await this.prisma.issue.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Issue ${id} not found`);

    const deleted = await this.prisma.issue.delete({ where: { id } });

    await this.audit.logAction(
      user.id,
      "ISSUE_DELETE",
      "ISSUE",
      `Issue ${id} deleted by ${user.name} (${user.role})`
    );

    return deleted;
  }

  // 🔹 Get all clusters for the current user
  async getClusters(user: any) {
    const isAdmin = user?.role?.toLowerCase() === "admin" || user?.role === "admin";
    
    // Admin sees all clusters, others see only assigned clusters
    const clusters = await this.prisma.cluster.findMany({
      where: isAdmin ? {} : { assignedOperators: { has: user?.id || "" } },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // console.log(`[Issues Service] getClusters - User: ${user?.email}, Role: ${user?.role}, IsAdmin: ${isAdmin}, Found: ${clusters.length}`);
    return clusters;
  }

  // 🔹 Get locations (loadshares) by cluster
  async getLocationsByCluster(clusterId: string) {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster) {
      throw new NotFoundException(`Cluster with ID ${clusterId} not found`);
    }

    return this.prisma.loadShare.findMany({
      where: { clusterId },
      select: {
        id: true,
        nameOfLocation: true,
        rtNumber: true,
        address: true,
        state: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // 🔹 Get operators assigned to a cluster
  async getOperatorsByCluster(clusterId: string) {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster) {
      throw new NotFoundException(`Cluster with ID ${clusterId} not found`);
    }

    if (!cluster.assignedOperators || cluster.assignedOperators.length === 0) {
      return [];
    }

    // Get user details for each operator ID
    return this.prisma.user.findMany({
      where: {
        id: {
          in: cluster.assignedOperators,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    });
  }
}
