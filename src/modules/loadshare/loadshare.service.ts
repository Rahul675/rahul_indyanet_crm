// import {
//   Injectable,
//   NotFoundException,
//   BadRequestException,
// } from "@nestjs/common";
// import { PrismaService } from "../../prisma/prisma.service";
// import { CreateLoadShareDto } from "./dto/create-loadshare.dto";
// import { UpdateLoadShareDto } from "./dto/update-loadshare.dto";
// import { Prisma } from "@prisma/client";

// @Injectable()
// export class LoadShareService {
//   constructor(private readonly prisma: PrismaService) {}

//   // 🧮 Helper: Calculate GST and total
//   private calculateAmounts(
//     internetCharges: number,
//     installationCharges: number,
//     gstPercent: number
//   ) {
//     const safeInternet = Number(internetCharges) || 0;
//     const safeInstall = Number(installationCharges) || 0;
//     const safeGst = Number(gstPercent) || 0;
//     const gstAmount = (safeInternet * safeGst) / 100;
//     const totalPayable = safeInternet + safeInstall + gstAmount;
//     return { gstAmount, totalPayable };
//   }

//   // ✅ Create
//   async create(data: CreateLoadShareDto) {
//     try {
//       const { gstAmount, totalPayable } = this.calculateAmounts(
//         data.internetCharges,
//         data.installationCharges,
//         data.gstPercent
//       );
//       return await this.prisma.loadShare.create({
//         data: {
//           ...data,
//           circuitId: data.circuitId ?? "",
//           isp: data.isp ?? "",
//           invoice: data.invoice ?? "",
//           speed: data.speed ?? "",
//           requestedBy: data.requestedBy ?? "",
//           approvedFrom: data.approvedFrom ?? "",
//           wifiOrNumber: data.wifiOrNumber ?? "",
//           hubSpocName: data.hubSpocName ?? "",
//           hubSpocNumber: data.hubSpocNumber ?? "",
//           month: data.month ?? "",
//           gstAmount,
//           totalPayable,
//         },
//       });
//     } catch (error) {
//       console.error("❌ Create LoadShare Error:", error);
//       throw new BadRequestException("Failed to create LoadShare record");
//     }
//   }

//   // ✅ Find all / search
//   async findAll(
//     search?: string,
//     skip: number = 0,
//     take?: number, // FIXED: cannot set default as `number`
//     sortBy: string = "createdAt",
//     sortOrder: Prisma.SortOrder = "desc"
//   ) {
//     const where: Prisma.LoadShareWhereInput | undefined = search
//       ? {
//           OR: [
//             { rtNumber: { contains: search, mode: "insensitive" } },
//             { nameOfLocation: { contains: search, mode: "insensitive" } },
//             { address: { contains: search, mode: "insensitive" } },
//           ],
//         }
//       : undefined;

//     return this.prisma.loadShare.findMany({
//       where,
//       orderBy: { [sortBy]: sortOrder },
//       skip,
//       take: take ?? undefined, // ⭐ FIX: if take is undefined → return ALL
//     });
//   }

//   // ✅ Find one
//   async findOne(id: string) {
//     const record = await this.prisma.loadShare.findUnique({ where: { id } });
//     if (!record)
//       throw new NotFoundException(`LoadShare record with ID ${id} not found`);
//     return record;
//   }

//   // ✅ Update
//   async update(id: string, data: UpdateLoadShareDto) {
//     const existing = await this.findOne(id);
//     const { gstAmount, totalPayable } = this.calculateAmounts(
//       data.internetCharges ?? existing.internetCharges,
//       data.installationCharges ?? existing.installationCharges,
//       data.gstPercent ?? existing.gstPercent
//     );
//     return this.prisma.loadShare.update({
//       where: { id },
//       data: {
//         ...data,
//         month: data.month ?? existing.month ?? "",
//         gstAmount,
//         totalPayable,
//       },
//     });
//   }

//   // ✅ Delete
//   async remove(id: string) {
//     await this.findOne(id);
//     return this.prisma.loadShare.delete({ where: { id } });
//   }

//   // ✅ Bulk Delete (Clear All)
//   async clearAll() {
//     const result = await this.prisma.loadShare.deleteMany({});
//     return result;
//   }

//   // ✅ Bulk import (Excel + JSON-safe, with upsert support)
//   async bulkImport(data: CreateLoadShareDto[]) {
//     if (!data || data.length === 0)
//       throw new BadRequestException("No data provided for import");

//     const missingRtNumbers: string[] = [];
//     const duplicateRtNumbers: string[] = [];
//     const seen = new Set<string>();
//     let importedCount = 0;

//     const createdOrUpdated = await Promise.all(
//       data.map(async (entry, index) => {
//         const rt = entry.rtNumber?.trim();
//         if (!rt) {
//           missingRtNumbers.push(`Row ${index + 1} (No RT number)`);
//           return null;
//         }
//         if (seen.has(rt)) {
//           duplicateRtNumbers.push(rt);
//           return null;
//         }
//         seen.add(rt);

//         const { gstAmount, totalPayable } = this.calculateAmounts(
//           entry.internetCharges,
//           entry.installationCharges,
//           entry.gstPercent
//         );

//         const parseExcelDate = (value: any): Date | undefined => {
//           if (!value) return undefined;
//           if (typeof value === "number") {
//             const excelEpoch = new Date(Date.UTC(1899, 11, 30));
//             return new Date(excelEpoch.getTime() + value * 86400000);
//           }
//           const parsed = new Date(value);
//           return isNaN(parsed.getTime()) ? undefined : parsed;
//         };

//         const activationDate = parseExcelDate(entry.activationDate);
//         const expiryDate = parseExcelDate(entry.expiryDate);

//         try {
//           const cleanEntry = {
//             ...entry,
//             circuitId: entry.circuitId ?? "",
//             isp: entry.isp ?? "",
//             invoice: entry.invoice ?? "",
//             speed: entry.speed ?? "",
//             requestedBy: entry.requestedBy ?? "",
//             approvedFrom: entry.approvedFrom ?? "",
//             wifiOrNumber: entry.wifiOrNumber ?? "",
//             hubSpocName: entry.hubSpocName ?? "",
//             hubSpocNumber: entry.hubSpocNumber ?? "",
//             month: entry.month ?? "",
//             address: entry.address ?? "-", // handle missing address
//           };

//           const record = await this.prisma.loadShare.upsert({
//             where: { rtNumber: rt },
//             update: {
//               ...cleanEntry,
//               ...(activationDate ? { activationDate } : {}),
//               ...(expiryDate ? { expiryDate } : {}),
//               gstAmount,
//               totalPayable,
//             },
//             create: {
//               ...cleanEntry,
//               ...(activationDate ? { activationDate } : {}),
//               ...(expiryDate ? { expiryDate } : {}),
//               gstAmount,
//               totalPayable,
//             },
//           });

//           importedCount++;
//           return record;
//         } catch (error: unknown) {
//           const message =
//             error instanceof Error ? error.message : "Unknown error occurred";
//           console.error(`❌ Error importing RT number ${rt}:`, message);
//           return null;
//         }
//       })
//     );

//     const successful = createdOrUpdated.filter(Boolean);

//     return {
//       success: true,
//       message: `Imported ${importedCount} records successfully.`,
//       importedCount,
//       skippedCount: missingRtNumbers.length + duplicateRtNumbers.length,
//       missingRtNumbers,
//       duplicateRtNumbers,
//       data: successful,
//     };
//   }
// }

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

  /* ----------------------- Utils ----------------------- */
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

  private async validateCluster(clusterId: string) {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster) {
      throw new BadRequestException("Invalid clusterId");
    }
  }

  /* ----------------------- Create ----------------------- */
  async create(data: CreateLoadShareDto) {
    if (!data.clusterId) {
      throw new BadRequestException("clusterId is required");
    }

    await this.validateCluster(data.clusterId);

    const { gstAmount, totalPayable } = this.calculateAmounts(
      data.internetCharges,
      data.installationCharges,
      data.gstPercent
    );

    return this.prisma.loadShare.create({
      data: {
        ...data,
        clusterId: data.clusterId,
        circuitId: data.circuitId ?? "",
        isp: data.isp ?? "",
        invoice: data.invoice?.toString() ?? "", // ✅ convert to string
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
  }

  /* ----------------------- Read ----------------------- */
  async findAll(
    search?: string,
    clusterId?: string,
    skip = 0,
    take?: number,
    sortBy = "createdAt",
    sortOrder: Prisma.SortOrder = "desc",
    month?: string // 👈 Step 3: Add month parameter
  ) {
    if (!clusterId) {
      throw new BadRequestException("clusterId is required");
    }

    const where: Prisma.LoadShareWhereInput = {
      clusterId,
      ...(search && {
        OR: [
          { rtNumber: { contains: search, mode: "insensitive" } },
          { nameOfLocation: { contains: search, mode: "insensitive" } },
          { address: { contains: search, mode: "insensitive" } },
          { wifiOrNumber: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    // 👈 Step 4: Logic to filter by expiryDate month
    // inside loadshare.service.ts -> findAll()
    if (month !== undefined && month !== "") {
      const monthIndex = parseInt(month);
      const currentYear = new Date().getUTCFullYear(); // Use UTC year

      // Start: 1st day of the month at 00:00:00 UTC
      const startDate = new Date(Date.UTC(currentYear, monthIndex, 1, 0, 0, 0));

      // End: Last day of the month at 23:59:59 UTC
      const endDate = new Date(
        Date.UTC(currentYear, monthIndex + 1, 0, 23, 59, 59, 999)
      );

      where.expiryDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    return this.prisma.loadShare.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take,
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.loadShare.findUnique({
      where: { id },
      include: { cluster: true },
    });

    if (!record) {
      throw new NotFoundException(`LoadShare with ID ${id} not found`);
    }

    return record;
  }

  /* ----------------------- Update ----------------------- */
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
        clusterId: data.clusterId ?? existing.clusterId,
        invoice: data.invoice?.toString() ?? existing.invoice, // ✅ convert to string
        month: data.month ?? existing.month ?? "",
        gstAmount,
        totalPayable,
      },
    });
  }

  /* ----------------------- Delete ----------------------- */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.loadShare.delete({ where: { id } });
  }

  async clearAll(clusterId: string) {
    if (!clusterId) {
      throw new BadRequestException("clusterId is required");
    }

    return this.prisma.loadShare.deleteMany({
      where: { clusterId },
    });
  }

  async bulkImport(data: CreateLoadShareDto[]) {
    if (!data?.length) {
      throw new BadRequestException("No data provided for import");
    }

    // console.log("\n📊 ===== BULK IMPORT STARTED =====");
    // console.log(`📋 Total records to process: ${data.length}`);
    // console.log("🔍 Inspecting first record:", JSON.stringify(data[0]));

    const seen = new Set<string>();
    const duplicateRtNumbers: string[] = [];
    const existingRtNumbers: string[] = [];
    const otherErrors: string[] = [];
    let importedCount = 0;

    // Helper function to normalize RT number format for comparison
    const normalizeRtNumber = (rt: string) => {
      return rt.trim().replace(/\s+/g, "-").toUpperCase();
    };

    const results = await Promise.all(
      data.map(async (entry, idx) => {
        const rt = normalizeRtNumber(entry.rtNumber?.trim() || "");
        
        if (!rt) {
            // console.log(`⏭️  Row ${idx} skipped - Missing RT number. Entry:`, entry);
          otherErrors.push(`Row ${idx}: Missing RT number`);
          return null;
        }

        if (!entry.clusterId) {
          // console.log(`⏭️  Row ${idx} skipped - Missing clusterId. RT: ${rt}`);
          otherErrors.push(`Row ${idx}: Missing clusterId`);
          return null;
        }

        // Check for duplicates within the import batch
        if (seen.has(rt)) {
          // console.log(`🔁 Row ${idx} - Duplicate RT in batch: ${rt}`);
          duplicateRtNumbers.push(rt);
          return null;
        }
        seen.add(rt);

        try {
          await this.validateCluster(entry.clusterId);
        } catch (err) {
          // console.log(`❌ Row ${idx} - Invalid cluster: ${entry.clusterId}`);
          otherErrors.push(`Row ${idx}: Invalid cluster`);
          return null;
        }

        // Check if RT number already exists in database (flexible format matching)
        try {
          // First try exact match with normalized format
          const existingRecord = await this.prisma.loadShare.findUnique({
            where: { rtNumber: rt },
          });

          if (existingRecord) {
          //  console.log(`📌 Row ${idx} - RT already exists (exact): ${rt}`);
            existingRtNumbers.push(rt);
            return null;
          }

          // If not found, try case-insensitive and space/hyphen flexible search
          const allRts = await this.prisma.loadShare.findMany({
            where: { clusterId: entry.clusterId },
            select: { rtNumber: true },
          });

          const rtNormalized = rt.toLowerCase().replace(/[\s\-]/g, "");
          const isDuplicate = allRts.some(
            (rec) =>
              rec.rtNumber.toLowerCase().replace(/[\s\-]/g, "") === rtNormalized
          );

          if (isDuplicate) {
            // console.log(`📌 Row ${idx} - RT already exists (flexible match): ${rt}`);
            existingRtNumbers.push(rt);
            return null;
          }
        } catch (err: any) {
          // console.log(`⚠️  Row ${idx} - Error checking existing RT: ${err.message}`);
        }

        const { gstAmount, totalPayable } = this.calculateAmounts(
          Number(entry.internetCharges) || 0,
          Number(entry.installationCharges) || 0,
          Number(entry.gstPercent) || 0
        );

        // ✅ Always return Date | null
        const parseExcelDate = (value: any): Date | null => {
          if (!value || value === "") return null;

          if (typeof value === "number") {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            return new Date(excelEpoch.getTime() + value * 86400000);
          }

          const parsed = new Date(value);
          return isNaN(parsed.getTime()) ? null : parsed;
        };

        const activationDate = parseExcelDate(entry.activationDate);
        const expiryDate = parseExcelDate(entry.expiryDate);

        const cleanEntry = {
          clusterId: entry.clusterId,
          rtNumber: rt,
          nameOfLocation: entry.nameOfLocation,
          address: entry.address ?? "-",
          state: entry.state,
          circuitId: entry.circuitId ?? "",
          isp: entry.isp ?? "",
          invoice:
            entry.invoice != null
              ? isNaN(Number(entry.invoice))
                ? String(entry.invoice).trim()
                : `INV-${entry.invoice}`
              : "",
          speed: entry.speed ?? "",
          status: entry.status ?? "Active",
          validity: Number(entry.validity) || 0,
          paidBy: entry.paidBy ?? "",
          requestedBy: entry.requestedBy ?? "",
          approvedFrom: entry.approvedFrom ?? "",
          wifiOrNumber: entry.wifiOrNumber
            ? String(entry.wifiOrNumber).trim()
            : "",

          hubSpocName:
            entry.hubSpocName != null ? String(entry.hubSpocName) : null,
          hubSpocNumber:
            entry.hubSpocNumber != null ? String(entry.hubSpocNumber) : null,
          month: entry.month ?? "",
          installationCharges: Number(entry.installationCharges) || 0,
          internetCharges: Number(entry.internetCharges) || 0,
          gstPercent: Number(entry.gstPercent) || 0,
        };

        try {
          const record = await this.prisma.loadShare.create({
            data: {
              ...cleanEntry,
              activationDate,
              expiryDate,
              gstAmount,
              totalPayable,
            },
          });

          // console.log(`✅ Row ${idx} - Created: ${rt}`);
          importedCount++;
          return record;
        } catch (err: any) {
          // console.log(`❌ Row ${idx} - Failed to create: ${rt}`, err);
          otherErrors.push(`Row ${idx}: Failed to create (${err?.message || 'Unknown error'})`);
          return null;
        }
      })
    );

    const totalSkipped = duplicateRtNumbers.length + existingRtNumbers.length + otherErrors.length;
    const messages: string[] = [];
    
    if (importedCount > 0) messages.push(`✅ ${importedCount} new record(s) imported`);
    if (duplicateRtNumbers.length > 0) messages.push(`🔁 ${duplicateRtNumbers.length} duplicate RT number(s) in file skipped`);
    if (existingRtNumbers.length > 0) messages.push(`📌 ${existingRtNumbers.length} RT number(s) already exist`);
    if (otherErrors.length > 0) messages.push(`⏭️  ${otherErrors.length} rows skipped (invalid or missing data)`);

    // console.log(`\n📊 ===== IMPORT COMPLETED =====`);
    // console.log(`✅ Imported: ${importedCount}`);
    // console.log(`📌 Existing: ${existingRtNumbers.length}`);
    // console.log(`🔁 Duplicates: ${duplicateRtNumbers.length}`);
    // console.log(`⏭️  Other errors: ${otherErrors.length}`);
    // console.log(`Total skipped: ${totalSkipped}`);
    // console.log(`Message: ${messages.join(' | ')}`);
    // console.log(`================================\n`);

    return {
      success: true,
      imported: importedCount,
      skipped: totalSkipped,
      duplicateRtNumbers: duplicateRtNumbers.length > 0 ? duplicateRtNumbers : [],
      existingRtNumbers: existingRtNumbers.length > 0 ? existingRtNumbers : [],
      message: messages.join(' | ') || "No records were imported",
      data: results.filter(Boolean),
    };
  }
}
