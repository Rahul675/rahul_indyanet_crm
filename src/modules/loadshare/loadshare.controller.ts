import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ForbiddenException,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { LoadShareService } from "./loadshare.service";
import { CreateLoadShareDto } from "./dto/create-loadshare.dto";
import { UpdateLoadShareDto } from "./dto/update-loadshare.dto";
import { ApiTags, ApiOperation, ApiConsumes } from "@nestjs/swagger";
import * as XLSX from "xlsx";
import { Request, Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("LoadShare")
@Controller("loadshare")
export class LoadShareController {
  constructor(private readonly service: LoadShareService) {}

  /* ----------------------- Create ----------------------- */
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: "Create a LoadShare record" })
  async create(@Body() dto: CreateLoadShareDto) {
    const record = await this.service.create(dto);
    return {
      success: true,
      message: "Record created successfully",
      data: record,
    };
  }

  /* ----------------------- Read ----------------------- */
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: "Get LoadShare records by cluster" })
  async findAll(
    @Query("clusterId") clusterId: string,
    @Query("search") search?: string
  ) {
    if (!clusterId) {
      throw new BadRequestException("clusterId is required");
    }

    const data = await this.service.findAll(search, clusterId);
    return {
      success: true,
      count: data.length,
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  @ApiOperation({ summary: "Get a single LoadShare record" })
  async findOne(@Param("id") id: string) {
    const record = await this.service.findOne(id);
    return { success: true, data: record };
  }

  /* ----------------------- Update ----------------------- */
  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  @ApiOperation({ summary: "Update LoadShare record" })
  async update(@Param("id") id: string, @Body() dto: UpdateLoadShareDto) {
    const updated = await this.service.update(id, dto);
    return {
      success: true,
      message: "Record updated successfully",
      data: updated,
    };
  }

  /* ----------------------- Delete ----------------------- */
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  @ApiOperation({ summary: "Delete LoadShare record (Admins only)" })
  async remove(@Param("id") id: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!user || user.role !== "admin") {
      throw new ForbiddenException("Only admins can delete records");
    }

    const deleted = await this.service.remove(id);
    return {
      success: true,
      message: "Record deleted successfully",
      data: deleted,
    };
  }

  /* ----------------------- Clear Cluster ----------------------- */
  @UseGuards(JwtAuthGuard)
  @Delete("clear/cluster")
  @ApiOperation({ summary: "Delete ALL LoadShares of a cluster (Admins only)" })
  async clearCluster(
    @Query("clusterId") clusterId: string,
    @Req() req: Request
  ) {
    const user = (req as any).user;

    if (!user || user.role !== "admin") {
      throw new ForbiddenException("Only admins can clear records");
    }

    if (!clusterId) {
      throw new BadRequestException("clusterId is required");
    }

    const result = await this.service.clearAll(clusterId);

    return {
      success: true,
      message: "🧹 Cluster LoadShares deleted successfully",
      deletedCount: result.count,
    };
  }

  /* ----------------------- Export Excel ----------------------- */
  @UseGuards(JwtAuthGuard)
  @Get("export/excel")
  async exportExcel(
    @Res() res: Response,
    @Query("clusterId") clusterId: string,
    @Query("month") month?: string // ✅ Capture month index from query
  ) {
    if (!clusterId) {
      throw new BadRequestException("clusterId is required");
    }

    // ✅ Pass the month to the service to filter the data
    const data = await this.service.findAll(
      undefined,
      clusterId,
      0,
      undefined,
      "createdAt",
      "desc",
      month
    );

    if (!data.length) {
      throw new BadRequestException("No records found for the selected month");
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "LoadShare");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthName = month ? `_${months[parseInt(month)]}` : "_All";
    const filename = `LoadShare_${monthName}_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  }

  // Import Excel (clusterId added automatically)
  @UseGuards(JwtAuthGuard)
  @Post("import/excel")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary:
      "Bulk import LoadShare records from Excel file (clusterId added automatically)",
  })
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Query("clusterId") clusterId: string
  ) {
    // console.log("\n🔍 ===== LOADSHARE IMPORT ENDPOINT CALLED =====");
    // console.log(`📝 ClusterId: ${clusterId}`);
    // console.log(`📄 File: ${file?.originalname}, Size: ${file?.size} bytes`);

    if (!file) throw new BadRequestException("No Excel file uploaded");
    if (!clusterId) {
      throw new BadRequestException("clusterId is required");
    }

    try {
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheet = workbook.SheetNames[0];
      const rawData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {
        defval: "",
      });

      if (!rawData.length)
        throw new BadRequestException("Excel file appears to be empty.");

      // console.log("📊 LoadShare import started");
      // console.log("📋 Total rows:", rawData.length);
      // console.log("📑 Column headers:", Object.keys(rawData[0] || {}));
      // console.log("📝 First row sample:", JSON.stringify(rawData[0]));

      // Helper function to find column value with flexible header matching
      const getVal = (row: any, possibleKeys: string[]) => {
        // Try exact matches first
        for (const key of possibleKeys) {
          if (row[key] !== undefined && row[key] !== null && row[key] !== "") 
            return row[key];
        }
        // Try case-insensitive and space-insensitive match
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

      // Automatically attach clusterId to each record
      const normalizedData = rawData.map((row) => ({
        clusterId,
        rtNumber: String(getVal(row, ["RT number", "rtNumber", "RT_Number", "rt_number", "Rt Number"]))
          .trim()
          .replace(/\s+/g, "-")  // Replace spaces with hyphens
          .toUpperCase() || "", // Normalize to uppercase
        nameOfLocation: String(getVal(row, ["Name of Location", "nameOfLocation", "name_of_location", "Name"])).trim() || "",
        address: String(getVal(row, ["address", "Address", "Destination", "destination"])).trim() || "-",
        state: String(getVal(row, ["State", "state", "STATE"])).trim() || "",
        circuitId: String(getVal(row, ["Circuit ID", "circuitId", "circuit_id", "CircuitID"])).trim() || "",
        isp: String(getVal(row, ["ISP", "isp", "ISP name", "ispName"])).trim() || "",
        invoice: String(getVal(row, ["Invoice #", "invoice", "invoiceNumber", "Invoice Number"])).trim() || "",
        speed: String(getVal(row, ["Speed", "speed", "Speed Mbps"])).trim() || "",
        status: String(getVal(row, ["Status", "status", "STATUS"])).trim() || "Active",
        validity: Number(getVal(row, ["Validity", "validity", "VALIDITY"])) || 0,
        paidBy: String(getVal(row, ["Paid by", "paidBy", "paid_by", "Paid By"])).trim() || "",
        activationDate: getVal(row, ["Activation Date", "activationDate", "activation_date", "Activation date"]) || "",
        expiryDate: getVal(row, ["Expiry Date", "expiryDate", "expiry_date", "Expiry date"]) || "",
        installationCharges: Number(getVal(row, ["Installation Charges", "installationCharges", "installation_charges"])) || 0,
        internetCharges: Number(getVal(row, ["Internet charges", "internetCharges", "internet_charges", "Internet Charges"])) || 0,
        gstPercent: Number(getVal(row, ["GST", "gstPercent", "gst_percent", "GST %"])) || 0,
        month: String(getVal(row, ["Month", "month", "MONTH"])).trim() || "",
        requestedBy: String(getVal(row, ["Requested By", "requestedBy", "requested_by"])).trim() || "",
        approvedFrom: String(getVal(row, ["Approved from", "approvedFrom", "approved_from"])).trim() || "",
        wifiOrNumber: String(getVal(row, ["Wifi / Number", "wifiOrNumber", "wifi_or_number"])).trim() || "",
        hubSpocName: String(getVal(row, ["Hub SPOC name", "hubSpocName", "hub_spoc_name"])).trim() || "",
        hubSpocNumber: String(getVal(row, ["Hub SPOC number", "hubSpocNumber", "hub_spoc_number"])).trim() || "",
      }));

      // console.log("📌 Normalized first record:", JSON.stringify(normalizedData[0]));

      const result = await this.service.bulkImport(normalizedData);

      // console.log(`✅ Import complete - Imported: ${result.imported}, Skipped: ${result.skipped}`);
      // console.log("✅ ===== LOADSHARE IMPORT ENDPOINT COMPLETED =====\n");

      return {
        success: true,
        message: result.message,
        imported: result.imported,
        skipped: result.skipped,
        duplicateRtNumbers: result.duplicateRtNumbers,
        existingRtNumbers: result.existingRtNumbers,
        records: result.data,
      };
    } catch (err: any) {
      // console.error("❌ Excel import failed:", err.message);
      // console.error("Stack:", err.stack);
      throw new BadRequestException(
        err?.message ?? "Failed to import Excel file"
      );
    }
  }
}
