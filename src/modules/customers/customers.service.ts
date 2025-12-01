// src/modules/customers/customers.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationService } from "../notifications/notification.service"; // ✅ add
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService // ✅ inject
  ) {}

  async create(data: CreateCustomerDto) {
    const parsedDate = new Date(data.installDate);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const customerCode = `CUST-${randomSuffix}`;

    const customer = await this.prisma.customer.create({
      data: {
        customerCode,
        ...data,
        installDate: parsedDate,
      },
    });

    // 🔔 Create notification
    await this.notifications.createNotification(
      "New Customer Added",
      `A new customer has been added: ${
        customer.fullName || customer.customerCode
      }`,
      undefined
    );

    return customer;
  }

  async findAll() {
    return this.prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      include: { issues: true },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { issues: true },
    });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  async update(id: string, data: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.delete({ where: { id } });
  }
}
