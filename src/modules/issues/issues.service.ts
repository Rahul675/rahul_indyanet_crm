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
    if (!user?.id) throw new Error("User not found in request");

    const customer = await this.prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${data.customerId} not found`
      );
    }

    const issue = await this.prisma.issue.create({
      data: { ...data, createdDate: new Date() },
      include: { customer: true },
    });

    // Log Issue Creation
    await this.audit.logAction(
      user.id,
      "ISSUE_CREATE",
      "ISSUE",
      `Issue created for ${customer.fullName} (ID: ${customer.id}) by ${user.name} (${user.role})`
    );

    await this.notifications.createNotification(
      "New Issue Created",
      `A new issue was raised for customer ${customer.fullName}`,
      user.id
    );

    return issue;
  }

  async findAll() {
    return this.prisma.issue.findMany({
      orderBy: { createdDate: "desc" },
      include: { customer: true },
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.issue.findMany({
      where: { customerId },
      orderBy: { createdDate: "desc" },
      include: { customer: true },
    });
  }

  async findOne(id: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!issue) throw new NotFoundException(`Issue with ID ${id} not found`);
    return issue;
  }

  async update(
    id: string,
    data: UpdateIssueDto,
    user: { id: string; name: string; role: string }
  ) {
    if (!user?.id) throw new Error("User not found in request");

    const existing = await this.prisma.issue.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Issue ${id} not found`);

    const updated = await this.prisma.issue.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: { customer: true },
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
    if (!user?.id) throw new Error("User not found in request");

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
}
