// src/modules/recharges/recharges.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationService } from "../notifications/notification.service"; // ✅ add
import { CreateRechargeDto } from "./dto/create-recharge.dto";
import { UpdateRechargeDto } from "./dto/update-recharge.dto";

@Injectable()
export class RechargesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService // ✅ inject
  ) {}

  async create(data: CreateRechargeDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) throw new NotFoundException("Customer not found");

    const rechargeDate = new Date(data.rechargeDate);
    const expiryDate = new Date(
      rechargeDate.getTime() + data.validityDays * 24 * 60 * 60 * 1000
    );

    const recharge = await this.prisma.recharge.create({
      data: {
        customerId: data.customerId,
        planType: data.planType,
        rechargeDate,
        amount: data.amount,
        validityDays: data.validityDays,
        expiryDate,
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId,
        remarks: data.remarks,
        status: data.status || "Active",
      },
      include: { customer: true },
    });

    await this.prisma.customer.update({
      where: { id: data.customerId },
      data: {
        planType: data.planType,
        lastRechargeDate: rechargeDate,
        expiryDate,
        connectionStatus: "Active",
        totalRecharges: { increment: 1 },
        totalSpent: { increment: data.amount },
      },
    });

    // 🔔 Notify new recharge
    await this.notifications.createNotification(
      "Recharge Added",
      `Recharge created for ${
        customer.fullName || customer.customerCode
      }. Expiry: ${expiryDate.toDateString()}.`
    );

    return recharge;
  }

  async findAll() {
    return this.prisma.recharge.findMany({
      orderBy: { rechargeDate: "desc" },
      include: { customer: true },
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.recharge.findMany({
      where: { customerId },
      orderBy: { rechargeDate: "desc" },
      include: { customer: true },
    });
  }

  async update(id: string, data: UpdateRechargeDto) {
    const existing = await this.prisma.recharge.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!existing) throw new NotFoundException("Recharge not found");

    const rechargeDate = data.rechargeDate
      ? new Date(data.rechargeDate)
      : existing.rechargeDate;

    const validityDays = data.validityDays ?? existing.validityDays;
    const expiryDate = new Date(
      rechargeDate.getTime() + validityDays * 24 * 60 * 60 * 1000
    );

    const updated = await this.prisma.recharge.update({
      where: { id },
      data: { ...data, rechargeDate, expiryDate },
      include: { customer: true },
    });

    await this.prisma.customer.update({
      where: { id: updated.customerId },
      data: {
        planType: data.planType ?? updated.customer.planType,
        lastRechargeDate: rechargeDate,
        expiryDate,
        connectionStatus: "Active",
      },
    });

    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.recharge.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!existing) throw new NotFoundException("Recharge not found");

    await this.prisma.recharge.delete({ where: { id } });

    await this.prisma.customer.update({
      where: { id: existing.customerId },
      data: {
        totalRecharges: { decrement: 1 },
        totalSpent: { decrement: existing.amount },
      },
    });

    return { message: "Recharge deleted successfully" };
  }
}
