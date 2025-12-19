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

      // Automatically attach clusterId to each record
      const normalizedData = rawData.map((row) => ({
        clusterId, // ✅ Added automatically
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
        records: result.data,
      };
    } catch (err: any) {
      console.error("❌ Excel import failed:", err);
      throw new BadRequestException(
        err?.message ?? "Failed to import Excel file"
      );
    }
  }
}
