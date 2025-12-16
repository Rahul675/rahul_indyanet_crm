import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOtherClientDto } from "./dto/create-other-client.dto";
import { UpdateOtherClientDto } from "./dto/update-other-client.dto";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";

@Injectable()
export class OtherClientsService {
  constructor(private prisma: PrismaService) {}

  // 🛠️ Helper to handle Excel's different date formats
  private parseExcelDate(value: any): Date | null {
    if (!value || value === "" || value === "NILL") return null;
    if (value instanceof Date) return value;
    if (typeof value === "number") {
      // Excel serial date conversion
      return new Date(Math.round((value - 25569) * 86400 * 1000));
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /* ----------------------- CRUD ----------------------- */

  async create(data: CreateOtherClientDto) {
    return this.prisma.otherClient.create({ data });
  }

  async findAll(search?: string) {
    const where: Prisma.OtherClientWhereInput = search
      ? {
          OR: [
            { site: { contains: search, mode: "insensitive" } },
            { lanIp: { contains: search, mode: "insensitive" } },
            { publicIp1: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const data = await this.prisma.otherClient.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return { success: true, count: data.length, data };
  }

  async findOne(id: string) {
    const record = await this.prisma.otherClient.findUnique({ where: { id } });
    if (!record) throw new NotFoundException("Record not found");
    return record;
  }

  async update(id: string, data: UpdateOtherClientDto) {
    return this.prisma.otherClient.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.otherClient.delete({ where: { id } });
  }

  async clearAll() {
    // This permanently deletes all records in the other_clients table
    return this.prisma.otherClient.deleteMany({});
  }

  /* ----------------------- EXCEL LOGIC ----------------------- */

  // async importExcel(buffer: Buffer) {
  //   try {
  //     const workbook = XLSX.read(buffer, { type: "buffer" });
  //     const sheet = workbook.Sheets[workbook.SheetNames[0]];

  //     // We use raw: true to preserve the exact header strings from your file
  //     const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  //     // Filter out empty rows at the bottom
  //     const validRows = rawData.filter(
  //       (row) => row["SITE"] && String(row["SITE"]).trim() !== ""
  //     );

  //     const formattedData = validRows.map((row) => {
  //       return {
  //         site: String(row["SITE"] || "").trim(),
  //         publicIp1: String(row["PUBLIC IP1"] || ""),
  //         publicIp2: String(row["PUBLIC IP2"] || ""),
  //         isp1: String(row["ISP 1"] || ""),
  //         isp2: String(row[" ISP 2"] || ""), // Handling leading space in header
  //         lanIp: String(row["LAN-IP"] || ""),
  //         remarks: String(row["REMARKS"] || ""),
  //         macId: String(row["MAC ID"] || ""),
  //         landlineWifiId: String(row["LANDLINE & WIFI ID\n"] || ""), // Handling newline
  //         speedMbps: String(row["Speed mbps"] || ""),

  //         // MAP TO: internetInstallation
  //         internetInstallation: String(row["INTERNET\n INSTALLATION"] || ""),

  //         // MAP TO: prevBillReceived
  //         prevBillReceived: String(
  //           row["PREVIOUS\nINTERNET BILL\nRECEIVED"] || ""
  //         ),

  //         // MAP TO: dispatchDate (DateTime)
  //         dispatchDate: this.parseExcelDate(row["DISPATCH \n   DATE"]),

  //         // MAP TO: reachedDayDate (DateTime)
  //         reachedDayDate: this.parseExcelDate(row["Reached \n   DAY"]),

  //         installationDate: this.parseExcelDate(row["Installtion\nDate"]),

  //         // MAP TO: aValue (Prisma expected aValue, but your Excel has column 'A')
  //         aValue: String(row["A"] || ""),

  //         // MAP TO: contactNo
  //         contactNo: String(row["Spoke \n contact\n  No."] || ""),

  //         dvrConnected: String(row["DVR Connected"] || ""),
  //         simNo: String(row["SIM NO"] || ""),

  //         // Satisfy schema requirements
  //         deviceName: "",
  //         deviceLicense: "",
  //       };
  //     });

  //     const created = await this.prisma.otherClient.createMany({
  //       data: formattedData,
  //       skipDuplicates: true,
  //     });

  //     return { success: true, imported: created.count };
  //   } catch (error) {
  //     console.error("Prisma Error Details:", error);
  //     throw new BadRequestException(
  //       "Failed to import. Prisma schema mismatch."
  //     );
  //   }
  // }

  async importExcel(buffer: Buffer) {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      // We convert to JSON but we will clean the keys manually
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const formattedData = rawRows
        .filter((row) => row["SITE"] && String(row["SITE"]).trim() !== "")
        .map((row) => {
          // Helper to find value even if header has weird spaces/newlines
          const getVal = (possibleKeys: string[]) => {
            for (const key of possibleKeys) {
              if (row[key] !== undefined) return row[key];
            }
            // Try fuzzy match (ignore spaces and newlines)
            const cleanedKeys = Object.keys(row);
            for (const k of cleanedKeys) {
              const standardK = k.replace(/[\n\r\s]/g, "").toUpperCase();
              for (const p of possibleKeys) {
                if (standardK === p.replace(/[\n\r\s]/g, "").toUpperCase())
                  return row[k];
              }
            }
            return "";
          };

          return {
            site: String(getVal(["SITE"]) || "").trim(),
            publicIp1: String(getVal(["PUBLIC IP1"]) || ""),
            publicIp2: String(getVal(["PUBLIC IP2"]) || ""),
            isp1: String(getVal(["ISP 1"]) || ""),
            isp2: String(getVal([" ISP 2", "ISP 2"]) || ""),
            lanIp: String(getVal(["LAN-IP"]) || ""),
            remarks: String(getVal(["REMARKS"]) || ""),
            macId: String(getVal(["MAC ID"]) || ""),
            landlineWifiId: String(
              getVal(["LANDLINE & WIFI ID\n", "LANDLINE & WIFI ID"]) || ""
            ),
            speedMbps: String(getVal(["Speed mbps"]) || ""),

            // MAP TO SCHEMA: internetInstallation
            internetInstallation: String(
              getVal(["INTERNET\n INSTALLATION", "INTERNET INSTALLATION"]) || ""
            ),

            // MAP TO SCHEMA: prevBillReceived
            prevBillReceived: String(
              getVal([
                "PREVIOUS\nINTERNET BILL\nRECEIVED",
                "PREVIOUS INTERNET BILL RECEIVED",
              ]) || ""
            ),

            // MAP TO SCHEMA: dispatchDate (DateTime)
            dispatchDate: this.parseExcelDate(
              getVal(["DISPATCH \n   DATE", "DISPATCH DATE"])
            ),

            // MAP TO SCHEMA: reachedDayDate (DateTime)
            reachedDayDate: this.parseExcelDate(
              getVal(["Reached \n   DAY", "Reached DAY"])
            ),

            // MAP TO SCHEMA: installationDate (DateTime)
            installationDate: this.parseExcelDate(
              getVal(["Installtion\nDate", "Installation Date"])
            ),

            // MAP TO SCHEMA: aValue
            aValue: String(getVal(["A"]) || ""),

            // MAP TO SCHEMA: contactNo
            contactNo: String(
              getVal(["Spoke \n contact\n  No.", "Spoke contact No."]) || ""
            ),

            dvrConnected: String(getVal(["DVR Connected"]) || ""),
            simNo: String(getVal(["SIM NO"]) || ""),

            deviceName: "",
            deviceLicense: "",
          };
        });

      const created = await this.prisma.otherClient.createMany({
        data: formattedData,
        skipDuplicates: true,
      });

      return { success: true, imported: created.count };
    } catch (error) {
      // LOG THE REAL ERROR to your terminal so you can see it
      console.error("FULL PRISMA ERROR:", error);
      if (error instanceof Error) {
        throw new BadRequestException(`Import failed: ${error.message}`);
      }
      throw new BadRequestException("Import failed due to an unknown error.");
    }
  }

  async exportExcel() {
    const data = await this.prisma.otherClient.findMany();

    // Map database fields back to the specific Excel headers
    const excelRows = data.map((r) => ({
      SITE: r.site,
      "PUBLIC IP1": r.publicIp1,
      "ISP 1": r.isp1,
      "LAN-IP": r.lanIp,
      "MAC ID": r.macId,
      "Speed mbps": r.speedMbps,
      "SIM NO": r.simNo,
      "Installtion Date": r.installationDate,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }
}
