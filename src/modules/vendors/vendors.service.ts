import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationService } from "../notifications/notification.service";
import { CreateVendorDto } from "./dto/create-vendor.dto";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import * as ExcelJS from "exceljs";

@Injectable()
export class VendorsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService
  ) {}

  async create(data: CreateVendorDto) {
    const parsedDate = new Date(data.onboardDate);
    const count = await this.prisma.vendor.count();
    const nextNumber = count + 1;
    const code = `VEND-${String(nextNumber).padStart(4, "0")}`;

    const vendor = await this.prisma.vendor.create({
      data: {
        vendorCode: code,
        ...data,
        onboardDate: parsedDate,
      },
    });

    await this.notifications.createNotification(
      "New Vendor Added",
      `A new vendor has been added: ${vendor.vendorName || vendor.vendorCode}`,
      undefined
    );

    return vendor;
  }

  async findAll() {
    return this.prisma.vendor.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
    });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  async update(id: string, data: UpdateVendorDto) {
    await this.findOne(id);
    return this.prisma.vendor.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vendor.delete({ where: { id } });
  }

  async exportToExcel(): Promise<Buffer> {
    const vendors = await this.prisma.vendor.findMany({
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Vendors");

    worksheet.columns = [
      { header: "Vendor Code", key: "vendorCode", width: 20 },
      { header: "Vendor Name", key: "vendorName", width: 25 },
      { header: "Contact Number", key: "contactNumber", width: 15 },
      { header: "Services Type", key: "servicesType", width: 20 },
      { header: "Payment Mode", key: "paymentMode", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Onboard Date", key: "onboardDate", width: 15 },
    ];

    vendors.forEach((vendor) => {
      worksheet.addRow({
        vendorCode: vendor.vendorCode,
        vendorName: vendor.vendorName,
        contactNumber: vendor.contactNumber,
        servicesType: vendor.servicesType,
        paymentMode: vendor.paymentMode || "",
        status: vendor.status,
        onboardDate: vendor.onboardDate
          ? new Date(vendor.onboardDate).toLocaleDateString()
          : "",
      });
    });

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

    const currentCount = await this.prisma.vendor.count();
    let counter = currentCount;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      try {
        const cellValue = row.getCell(7).value;
        const data = {
          vendorName: row.getCell(2).value?.toString() || "",
          contactNumber: row.getCell(3).value?.toString() || "",
          servicesType: row.getCell(4).value?.toString() || "",
          paymentMode: row.getCell(5).value?.toString() || "",
          status: row.getCell(6).value?.toString() || "Active",
          onboardDate:
            cellValue && cellValue.toString()
              ? new Date(cellValue.toString())
              : new Date(),
        };

        counter += 1;
        const code = `VEND-${String(counter).padStart(4, "0")}`;

        imported.push(
          this.prisma.vendor.create({
            data: {
              vendorCode: code,
              ...data,
            },
          })
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        errors.push({ row: rowNumber, error: errorMessage });
      }
    });

    const results = await Promise.allSettled(imported);
    const successful = results.filter((r) => r.status === "fulfilled").length;

    return {
      message: `Imported ${successful} vendors successfully`,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
