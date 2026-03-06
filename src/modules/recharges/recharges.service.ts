// src/modules/recharges/recharges.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
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

  async create(data: CreateRechargeDto, user: any) {
    const loadshare = await this.prisma.loadShare.findUnique({
      where: { id: data.loadshareId },
      include: { cluster: true },
    });

    if (!loadshare) throw new NotFoundException("Loadshare not found");
    if (loadshare.clusterId !== data.clusterId)
      throw new BadRequestException("Loadshare does not belong to cluster");

    const isAdmin = (user?.role || "").toLowerCase() === "admin";
    if (!isAdmin && !loadshare.cluster.assignedOperators.includes(user?.id)) {
      throw new ForbiddenException("You are not assigned to this cluster");
    }

    const rechargeDate = new Date(data.rechargeDate);
    const currentExpiryDate = loadshare.expiryDate ? new Date(loadshare.expiryDate) : null;

    // Calculate new expiry date based on whether service is still active
    // If service is active (expiry date is in the future), extend from current expiry
    // Otherwise, calculate from recharge date
    let expiryDate: Date;
    if (currentExpiryDate && currentExpiryDate > rechargeDate) {
      // Service is still active - add validity days to existing expiry date
      expiryDate = new Date(
        currentExpiryDate.getTime() + data.validityDays * 24 * 60 * 60 * 1000
      );
    } else {
      // Service expired or no previous expiry - calculate from recharge date
      expiryDate = new Date(
        rechargeDate.getTime() + data.validityDays * 24 * 60 * 60 * 1000
      );
    }

    const recharge = await this.prisma.recharge.create({
      data: {
        clusterId: data.clusterId,
        loadshareId: data.loadshareId,
        planType: data.planType,
        rechargeDate,
        amount: data.amount,
        customerPrice: data.customerPrice,
        validityDays: data.validityDays,
        expiryDate,
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId,
        remarks: data.remarks,
        status: data.status || "Active",
      },
      include: { loadshare: { include: { cluster: true } } },
    });

    // Update loadshare expiry date, speed, and validity to match recharge
    await this.prisma.loadShare.update({
      where: { id: data.loadshareId },
      data: { 
        expiryDate,
        speed: data.planType,
        validity: data.validityDays,
      },
    });

    return recharge;
  }

  async findAll(user: any, opts?: { clusterId?: string; loadshareId?: string; limit?: number }) {
    const isAdmin = (user?.role || "").toLowerCase() === "admin";

    const recharges = await this.prisma.recharge.findMany({
      where: {
        ...(opts?.clusterId ? { clusterId: opts.clusterId } : {}),
        ...(opts?.loadshareId ? { loadshareId: opts.loadshareId } : {}),
        ...(isAdmin
          ? {}
          : {
              loadshare: {
                cluster: { assignedOperators: { has: user?.id } },
              },
            }),
      },
      orderBy: { rechargeDate: "desc" },
      include: { loadshare: { include: { cluster: true } } },
      ...(opts?.limit ? { take: opts.limit } : {}),
    });

    return recharges;
  }

  async update(id: string, data: UpdateRechargeDto, user: any) {
    const existing = await this.prisma.recharge.findUnique({
      where: { id },
      include: { loadshare: { include: { cluster: true } } },
    });
    if (!existing) throw new NotFoundException("Recharge not found");

    const isAdmin = (user?.role || "").toLowerCase() === "admin";
    if (!isAdmin && existing.loadshare && !existing.loadshare.cluster.assignedOperators.includes(user?.id)) {
      throw new ForbiddenException("You are not assigned to this cluster");
    }

    const rechargeDate = data.rechargeDate
      ? new Date(data.rechargeDate)
      : existing.rechargeDate;

    const validityDays = data.validityDays ?? existing.validityDays;
    
    // Apply the same smart logic as create method
    const currentExpiryDate = existing.loadshare?.expiryDate ? new Date(existing.loadshare.expiryDate) : null;
    
    let expiryDate: Date;
    if (currentExpiryDate && currentExpiryDate > rechargeDate) {
      // Service is still active - add validity days to existing expiry date
      expiryDate = new Date(
        currentExpiryDate.getTime() + validityDays * 24 * 60 * 60 * 1000
      );
    } else {
      // Service expired or no previous expiry - calculate from recharge date
      expiryDate = new Date(
        rechargeDate.getTime() + validityDays * 24 * 60 * 60 * 1000
      );
    }

    const updated = await this.prisma.recharge.update({
      where: { id },
      data: { ...data, rechargeDate, expiryDate },
      include: { loadshare: { include: { cluster: true } } },
    });

    if (updated.loadshareId) {
      await this.prisma.loadShare.update({
        where: { id: updated.loadshareId },
        data: { 
          expiryDate,
          speed: data.planType || existing.planType,
          validity: validityDays,
        },
      });
    }

    return updated;
  }

  async remove(id: string, user: any) {
    const existing = await this.prisma.recharge.findUnique({
      where: { id },
      include: { loadshare: { include: { cluster: true } } },
    });
    if (!existing) throw new NotFoundException("Recharge not found");

    const isAdmin = (user?.role || "").toLowerCase() === "admin";
    if (!isAdmin && existing.loadshare && !existing.loadshare.cluster.assignedOperators.includes(user?.id)) {
      throw new ForbiddenException("You are not assigned to this cluster");
    }

    await this.prisma.recharge.delete({ where: { id } });

    return { message: "Recharge deleted successfully" };
  }
}
