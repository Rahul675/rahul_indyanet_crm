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

  // ✅ Create
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

  // ✅ Get all / search
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: "Get all LoadShare records or search" })
  async findAll(@Query("search") search?: string) {
    const data = await this.service.findAll(search);
    return { success: true, count: data.length, data };
  }

  // ✅ Get by ID
  @UseGuards(JwtAuthGuard)
  @Get(":id")
  @ApiOperation({ summary: "Get a single LoadShare record by ID" })
  async findOne(@Param("id") id: string) {
    const record = await this.service.findOne(id);
    return { success: true, data: record };
  }

  // ✅ Update
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

  // ✅ Delete single (Admins only)
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

  // ✅ Delete ALL (Admins only)
  @UseGuards(JwtAuthGuard)
  @Delete("clear/all")
  @ApiOperation({ summary: "Delete ALL LoadShare records (Admins only)" })
  async clearAll(@Req() req: Request) {
    const user = (req as any).user;

    if (!user || user.role !== "admin") {
      throw new ForbiddenException("Only admins can clear all records");
    }

    const result = await this.service.clearAll();
    return {
      success: true,
      message: "🧹 All LoadShare records deleted successfully",
      deletedCount: result.count,
    };
  }

  // ✅ Export Excel
  @UseGuards(JwtAuthGuard)
  @Get("export/excel")
  @ApiOperation({ summary: "Export all LoadShare records as Excel" })
  async exportExcel(@Res() res: Response) {
    try {
      const data = await this.service.findAll();
      if (!data.length)
        throw new BadRequestException("No LoadShare records found to export");

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "LoadShare");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const filename = `LoadShare_Export_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=\"${filename}\"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (err) {
      console.error("❌ Excel export failed:", err);
      throw new BadRequestException("Failed to export Excel file");
    }
  }

  // ✅ Import Excel
  @UseGuards(JwtAuthGuard)
  @Post("import/excel")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Bulk import LoadShare records from Excel file" })
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No Excel file uploaded");

    try {
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheet = workbook.SheetNames[0];
      const rawData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {
        defval: "",
      });

      if (!rawData.length)
        throw new BadRequestException("Excel file appears to be empty.");

      const normalizedData = rawData.map((row) => ({
        rtNumber: row["RT number"]?.trim() || "",
        nameOfLocation: row["Name of Location"] || "",
        address: "-",
        state: row["State"] || "",
        circuitId: row["Circuit ID"] || "",
        isp: row["ISP"] || "",
        invoice: row["Invoice #"] || "",
        speed: row["Speed"]?.toString() || "",
        status: row["Status"] || "",
        validity: Number(row["Validity"]) || 0,
        paidBy: row["Paid by"] || "",
        activationDate: row["Activation Date"] || "",
        expiryDate: row["Expiry Date"] || "",
        installationCharges: Number(row["Installation Charges"]) || 0,
        internetCharges: Number(row["Internet charges"]) || 0,
        gstPercent: Number(row["GST"]) || 0,
        month: row["Month"] || "",
        requestedBy: row["Requested By"] || "",
        approvedFrom: row["Approved from"] || "",
        wifiOrNumber: row["Wifi / Number"] || "",
        hubSpocName: row["Hub SPOC name"] || "",
        hubSpocNumber: row["Hub SPOC number"] || "",
      }));

      const result = await this.service.bulkImport(normalizedData);

      return {
        success: true,
        message: `✅ Imported ${result.importedCount} records successfully.`,
        imported: result.importedCount,
        skipped: result.skippedCount,
        missingRtNumbers: result.missingRtNumbers,
        duplicateRtNumbers: result.duplicateRtNumbers,
      };
    } catch (err: any) {
      console.error("❌ Excel import failed:", err);
      throw new BadRequestException(
        err?.message ?? "Failed to import Excel file"
      );
    }
  }
}
