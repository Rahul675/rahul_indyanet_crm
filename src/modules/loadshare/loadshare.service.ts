import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateLoadShareDto } from "./dto/create-loadshare.dto";
import { UpdateLoadShareDto } from "./dto/update-loadshare.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class LoadShareService {
  constructor(private readonly prisma: PrismaService) {}

  // 🧮 Helper: Calculate GST and total
  private calculateAmounts(
    internetCharges: number,
    installationCharges: number,
    gstPercent: number
  ) {
    const safeInternet = Number(internetCharges) || 0;
    const safeInstall = Number(installationCharges) || 0;
    const safeGst = Number(gstPercent) || 0;
    const gstAmount = (safeInternet * safeGst) / 100;
    const totalPayable = safeInternet + safeInstall + gstAmount;
    return { gstAmount, totalPayable };
  }

  // ✅ Create
  async create(data: CreateLoadShareDto) {
    try {
      const { gstAmount, totalPayable } = this.calculateAmounts(
        data.internetCharges,
        data.installationCharges,
        data.gstPercent
      );
      return await this.prisma.loadShare.create({
        data: {
          ...data,
          circuitId: data.circuitId ?? "",
          isp: data.isp ?? "",
          invoice: data.invoice ?? "",
          speed: data.speed ?? "",
          requestedBy: data.requestedBy ?? "",
          approvedFrom: data.approvedFrom ?? "",
          wifiOrNumber: data.wifiOrNumber ?? "",
          hubSpocName: data.hubSpocName ?? "",
          hubSpocNumber: data.hubSpocNumber ?? "",
          month: data.month ?? "",
          gstAmount,
          totalPayable,
        },
      });
    } catch (error) {
      console.error("❌ Create LoadShare Error:", error);
      throw new BadRequestException("Failed to create LoadShare record");
    }
  }

  // ✅ Find all / search
  async findAll(
    search?: string,
    skip: number = 0,
    take?: number, // FIXED: cannot set default as `number`
    sortBy: string = "createdAt",
    sortOrder: Prisma.SortOrder = "desc"
  ) {
    const where: Prisma.LoadShareWhereInput | undefined = search
      ? {
          OR: [
            { rtNumber: { contains: search, mode: "insensitive" } },
            { nameOfLocation: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined;

    return this.prisma.loadShare.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: take ?? undefined, // ⭐ FIX: if take is undefined → return ALL
    });
  }

  // ✅ Find one
  async findOne(id: string) {
    const record = await this.prisma.loadShare.findUnique({ where: { id } });
    if (!record)
      throw new NotFoundException(`LoadShare record with ID ${id} not found`);
    return record;
  }

  // ✅ Update
  async update(id: string, data: UpdateLoadShareDto) {
    const existing = await this.findOne(id);
    const { gstAmount, totalPayable } = this.calculateAmounts(
      data.internetCharges ?? existing.internetCharges,
      data.installationCharges ?? existing.installationCharges,
      data.gstPercent ?? existing.gstPercent
    );
    return this.prisma.loadShare.update({
      where: { id },
      data: {
        ...data,
        month: data.month ?? existing.month ?? "",
        gstAmount,
        totalPayable,
      },
    });
  }

  // ✅ Delete
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.loadShare.delete({ where: { id } });
  }

  // ✅ Bulk Delete (Clear All)
  async clearAll() {
    const result = await this.prisma.loadShare.deleteMany({});
    return result;
  }

  // ✅ Bulk import (Excel + JSON-safe, with upsert support)
  async bulkImport(data: CreateLoadShareDto[]) {
    if (!data || data.length === 0)
      throw new BadRequestException("No data provided for import");

    const missingRtNumbers: string[] = [];
    const duplicateRtNumbers: string[] = [];
    const seen = new Set<string>();
    let importedCount = 0;

    const createdOrUpdated = await Promise.all(
      data.map(async (entry, index) => {
        const rt = entry.rtNumber?.trim();
        if (!rt) {
          missingRtNumbers.push(`Row ${index + 1} (No RT number)`);
          return null;
        }
        if (seen.has(rt)) {
          duplicateRtNumbers.push(rt);
          return null;
        }
        seen.add(rt);

        const { gstAmount, totalPayable } = this.calculateAmounts(
          entry.internetCharges,
          entry.installationCharges,
          entry.gstPercent
        );

        const parseExcelDate = (value: any): Date | undefined => {
          if (!value) return undefined;
          if (typeof value === "number") {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            return new Date(excelEpoch.getTime() + value * 86400000);
          }
          const parsed = new Date(value);
          return isNaN(parsed.getTime()) ? undefined : parsed;
        };

        const activationDate = parseExcelDate(entry.activationDate);
        const expiryDate = parseExcelDate(entry.expiryDate);

        try {
          const cleanEntry = {
            ...entry,
            circuitId: entry.circuitId ?? "",
            isp: entry.isp ?? "",
            invoice: entry.invoice ?? "",
            speed: entry.speed ?? "",
            requestedBy: entry.requestedBy ?? "",
            approvedFrom: entry.approvedFrom ?? "",
            wifiOrNumber: entry.wifiOrNumber ?? "",
            hubSpocName: entry.hubSpocName ?? "",
            hubSpocNumber: entry.hubSpocNumber ?? "",
            month: entry.month ?? "",
            address: entry.address ?? "-", // handle missing address
          };

          const record = await this.prisma.loadShare.upsert({
            where: { rtNumber: rt },
            update: {
              ...cleanEntry,
              ...(activationDate ? { activationDate } : {}),
              ...(expiryDate ? { expiryDate } : {}),
              gstAmount,
              totalPayable,
            },
            create: {
              ...cleanEntry,
              ...(activationDate ? { activationDate } : {}),
              ...(expiryDate ? { expiryDate } : {}),
              gstAmount,
              totalPayable,
            },
          });

          importedCount++;
          return record;
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "Unknown error occurred";
          console.error(`❌ Error importing RT number ${rt}:`, message);
          return null;
        }
      })
    );

    const successful = createdOrUpdated.filter(Boolean);

    return {
      success: true,
      message: `Imported ${importedCount} records successfully.`,
      importedCount,
      skippedCount: missingRtNumbers.length + duplicateRtNumbers.length,
      missingRtNumbers,
      duplicateRtNumbers,
      data: successful,
    };
  }
}
