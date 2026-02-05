// src/modules/customers/customers.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationService } from "../notifications/notification.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import * as ExcelJS from "exceljs";

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService // ✅ inject
  ) {}

  async create(data: CreateCustomerDto) {
    const parsedDate = new Date(data.installDate);
    // Get the count of existing customers and generate incrementing code
    const count = await this.prisma.customer.count();
    const nextNumber = count + 1;
    const code = `CUST-${String(nextNumber).padStart(4, "0")}`;
    
    const customer = await this.prisma.customer.create({
      data: {
        customerCode: code,
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

  async exportToExcel(): Promise<Buffer> {
    const customers = await this.prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Customers");

    // Define columns
    worksheet.columns = [
      { header: "Customer Code", key: "customerCode", width: 20 },
      { header: "Full Name", key: "fullName", width: 25 },
      { header: "Contact Number", key: "contactNumber", width: 15 },
      { header: "Email", key: "email", width: 30 },
      { header: "Address", key: "address", width: 40 },
      { header: "Services Type", key: "servicesType", width: 20 },
      { header: "Payment Mode", key: "paymentMode", width: 15 },
      { header: "Connection Status", key: "connectionStatus", width: 15 },
      { header: "Install Date", key: "installDate", width: 15 },
    ];

    // Add rows
    customers.forEach((customer) => {
      worksheet.addRow({
        customerCode: customer.customerCode,
        fullName: customer.fullName,
        contactNumber: customer.contactNumber,
        email: "",
        address: "",
        servicesType: customer.servicesType,
        paymentMode: customer.paymentMode || "",
        connectionStatus: customer.connectionStatus,
        installDate: customer.installDate
          ? new Date(customer.installDate).toLocaleDateString()
          : "",
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async importFromExcel(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error("No worksheet found in Excel file");
    }

    const imported: Promise<any>[] = [];
    const errors: { row: number; error: string }[] = [];

    const currentCount = await this.prisma.customer.count();
    let counter = currentCount;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      try {
        const cellValue = row.getCell(9).value;
        const data = {
          fullName: row.getCell(2).value?.toString() || "",
          contactNumber: row.getCell(3).value?.toString() || "",
          servicesType: row.getCell(6).value?.toString() || "",
          paymentMode: row.getCell(7).value?.toString() || "",
          connectionStatus: row.getCell(8).value?.toString() || "Active",
          installDate:
            cellValue && cellValue.toString()
              ? new Date(cellValue.toString())
              : new Date(),
        };

        // Generate incrementing customer code
        counter += 1;
        const code = `CUST-${String(counter).padStart(4, "0")}`;

        imported.push(
          this.prisma.customer.create({
            data: {
              customerCode: code,
              ...data,
            },
          })
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        errors.push({ row: rowNumber, error: errorMessage });
      }
    });

    const results = await Promise.allSettled(imported);
    const successful = results.filter((r) => r.status === "fulfilled").length;

    return {
      message: `Imported ${successful} customers successfully`,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
