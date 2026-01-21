import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOtherClientGroupDto } from "./dto/create-other-client-group.dto";
import { UpdateOtherClientGroupDto } from "./dto/update-other-client-group.dto";
import { CreateOtherClientSiteDto } from "./dto/create-other-client.dto";
import { UpdateOtherClientSiteDto } from "./dto/update-other-client.dto";
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
    if (typeof value === "string") {
      const trimmed = value.trim();
      // Support dd/mm/yyyy or dd-mm-yyyy or d/m/yy
      const m = trimmed.match(
        /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/
      );
      if (m) {
        const d = parseInt(m[1], 10);
        const mo = parseInt(m[2], 10) - 1;
        const y = parseInt(m[3].length === 2 ? `20${m[3]}` : m[3], 10);
        const dt = new Date(y, mo, d);
        return isNaN(dt.getTime()) ? null : dt;
      }
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /* ======================= GROUP CRUD ======================= */

  async createGroup(data: CreateOtherClientGroupDto) {
    return this.prisma.otherClientGroup.create({ data });
  }

  async findAllGroups() {
    const data = await this.prisma.otherClientGroup.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { sites: true } } },
    });
    return { success: true, count: data.length, data };
  }

  async findOneGroup(id: string) {
    const record = await this.prisma.otherClientGroup.findUnique({
      where: { id },
      include: { sites: true },
    });
    if (!record) throw new NotFoundException("Group not found");
    return record;
  }

  async updateGroup(id: string, data: UpdateOtherClientGroupDto) {
    return this.prisma.otherClientGroup.update({ where: { id }, data });
  }

  async removeGroup(id: string) {
    return this.prisma.otherClientGroup.delete({ where: { id } });
  }

  /* ======================= SITE CRUD ======================= */

  async createSite(data: CreateOtherClientSiteDto) {
    // Verify group exists
    const group = await this.prisma.otherClientGroup.findUnique({
      where: { id: data.groupId },
    });
    if (!group) throw new NotFoundException("Group not found");

    return this.prisma.otherClientSite.create({ data });
  }

  async findAllSites(groupId: string, search?: string) {
    const where: Prisma.OtherClientSiteWhereInput = {
      groupId,
      ...(search
        ? {
            OR: [
              { site: { contains: search, mode: "insensitive" } },
              { lanIp: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const data = await this.prisma.otherClientSite.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return { success: true, count: data.length, data };
  }

  async findOneSite(id: string) {
    const record = await this.prisma.otherClientSite.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException("Site not found");
    return record;
  }

  async updateSite(id: string, data: UpdateOtherClientSiteDto) {
    // Remove groupId from update data to prevent changing parent
    const { groupId, ...updateData } = data;
    return this.prisma.otherClientSite.update({
      where: { id },
      data: updateData,
    });
  }

  async removeSite(id: string) {
    return this.prisma.otherClientSite.delete({ where: { id } });
  }

  async clearAllSites(groupId: string) {
    return this.prisma.otherClientSite.deleteMany({ where: { groupId } });
  }

  /* ======================= EXCEL LOGIC ======================= */

  async importExcel(buffer: Buffer, groupId: string) {
    // Verify group exists
    const group = await this.prisma.otherClientGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException("Group not found");

    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const formattedData: any[] = [];

      for (const row of rawRows) {
        const getVal = (possibleKeys: string[]) => {
          for (const key of possibleKeys) {
            if (row[key] !== undefined) return row[key];
          }
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

        const siteVal = String(getVal(["SITE", "Site", "site"]) || "").trim();
        if (!siteVal) continue; // skip rows without a valid site name

        const record = {
          groupId,
          site: siteVal,

          // Required columns (robust header matching)
          lanIp: String(
            getVal(["LAN-IP", "Lan-IP", "LAN IP", "LANIP"]) || ""
          ),
          remarks: String(getVal(["REMARKS", "Remarks"]) || ""),
          macId: String(getVal(["MAC ID", "MAC-ID", "Mac Id", "Mac-ID"]) || ""),
          landlineWifiId: String(
            getVal([
              "LANDLINE & WIFI ID\n",
              "LANDLINE & WIFI ID",
              "LANDLINE WIFI ID",
              "LANDLINE AND WIFI ID",
            ]) || ""
          ),
          speedMbps: String(getVal(["Speed mbps", "SPEED MBPS", "Speed Mbps"]) || ""),
          internet: String(getVal(["INTERNET", "Internet"]) || ""),
          installation: String(getVal(["INSTALLATION", "Installation"]) || ""),
          prevBillReceived: String(
            getVal([
              "PREVIOUS INTERNET BILLS",
              "PREVIOUS INTERNET BILL",
              "PREVIOUS INTERNET BILL RECEIVED",
              "PREVIOUS\nINTERNET BILL\nRECEIVED",
            ]) || ""
          ),
          received: String(getVal(["RECEIVED", "Received"]) || ""),
          dispatch: String(getVal(["DISPATCH", "Dispatch"]) || ""),
          dispatchDate: this.parseExcelDate(
            getVal(["DATE", "Dispatch Date", "DISPATCH DATE", "DISPATCH \n   DATE"])
          ),
          reachedDay: String(
            getVal(["REACHED DAY", "Reached DAY", "Reached \n   DAY"]) || ""
          ),
          installationDate: this.parseExcelDate(
            getVal(["INSTALLATION DATE", "Installation Date", "Installtion\nDate"])
          ),
          aValue: String(getVal(["A"]) || ""),
          aSpoke: String(getVal(["A SPOKE", "A Spoke"]) || ""),
          contactNo: String(
            getVal([
              "CONTACT NO.",
              "CONTACT NO",
              "CONTACT NUMBER",
              "Contact No.",
              "Contact No",
              "Spoke contact No.",
              "Spoke contact No",
              "Spoke \n contact\n  No.",
            ]) || ""
          ),
          dvrConnected: String(getVal(["DVR CONNECTED", "DVR Connected"]) || ""),
          simNo: String(getVal(["SIM NO", "SIM NO.", "Sim No", "Sim No."]) || ""),
          deviceName: String(
            getVal([
              "DEVICE NAME",
              "Device name",
              "DEVICE",
              "Device",
            ]) || ""
          ),
          deviceLicense: String(
            getVal([
              "DEVICE LICENSE",
              "DEVICE LICENCE",
              "Device license",
              "Device licence",
              "LICENSE KEY",
              "LICENCE KEY",
            ]) || ""
          ),
        };

        formattedData.push(record);
      }

      // Upsert logic: update existing by simNo or site+groupId; else create
      let createdCount = 0;
      let updatedCount = 0;

      for (const rec of formattedData) {
        const groupIdVal = rec.groupId as string;
        const simNoVal = (rec.simNo || "").toString().trim();
        const siteVal = (rec.site || "").toString().trim();
        const lanIpVal = (rec.lanIp || "").toString().trim();

        let existing = null as any;

        if (simNoVal) {
          existing = await this.prisma.otherClientSite.findFirst({
            where: { groupId: groupIdVal, simNo: simNoVal },
          });
        }

        if (!existing && siteVal) {
          existing = await this.prisma.otherClientSite.findFirst({
            where: { groupId: groupIdVal, site: siteVal },
          });
          if (!existing && lanIpVal) {
            existing = await this.prisma.otherClientSite.findFirst({
              where: { groupId: groupIdVal, site: siteVal, lanIp: lanIpVal },
            });
          }
        }

        if (existing) {
          const { groupId, id, createdAt, updatedAt, ...updateFields } = rec as any;
          await this.prisma.otherClientSite.update({
            where: { id: existing.id },
            data: updateFields,
          });
          updatedCount++;
        } else {
          await this.prisma.otherClientSite.create({ data: rec });
          createdCount++;
        }
      }

      return { success: true, imported: createdCount, updated: updatedCount };
    } catch (error) {
      console.error("FULL PRISMA ERROR:", error);
      if (error instanceof Error) {
        throw new BadRequestException(`Import failed: ${error.message}`);
      }
      throw new BadRequestException("Import failed due to an unknown error.");
    }
  }

  async exportExcel(groupId: string) {
    const data = await this.prisma.otherClientSite.findMany({
      where: { groupId },
    });

    const excelRows = data.map((r) => ({
      SITE: r.site,
      "LAN-IP": r.lanIp,
      "MAC ID": r.macId,
      "Speed mbps": r.speedMbps,
      INTERNET: r.internet,
      INSTALLATION: r.installation,
      RECEIVED: r.received,
      DISPATCH: r.dispatch,
      DATE: r.dispatchDate,
      "Reached DAY": r.reachedDay,
      "SIM NO": r.simNo,
      "Installation Date": r.installationDate,
      "PREVIOUS INTERNET BILL": r.prevBillReceived,
      "LANDLINE & WIFI ID": r.landlineWifiId,
      "Device name": r.deviceName,
      "Device license": r.deviceLicense,
      "A Spoke": r.aSpoke,
      "DVR Connected": r.dvrConnected,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }
}
