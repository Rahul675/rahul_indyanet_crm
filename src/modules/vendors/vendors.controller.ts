import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { VendorsService } from "./vendors.service";
import { CreateVendorDto } from "./dto/create-vendor.dto";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import { VendorEntity } from "./entities/vendor.entity";

@ApiTags("Vendors")
@Controller("vendors")
@UseGuards(JwtAuthGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new vendor" })
  @ApiResponse({ status: 201, type: VendorEntity })
  create(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorsService.create(createVendorDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all vendors" })
  @ApiResponse({ status: 200, type: [VendorEntity] })
  findAll() {
    return this.vendorsService.findAll();
  }

  @Get("export/excel")
  @ApiOperation({ summary: "Export vendors to Excel" })
  async exportExcel(@Res() res: Response) {
    const buffer = await this.vendorsService.exportToExcel();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=vendors.xlsx");
    res.send(buffer);
  }

  @Post("import/excel")
  @ApiOperation({ summary: "Import vendors from Excel" })
  @UseInterceptors(FileInterceptor("file"))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error("No file uploaded");
    }
    return this.vendorsService.importFromExcel(file.buffer);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific vendor by ID" })
  @ApiResponse({ status: 200, type: VendorEntity })
  findOne(@Param("id") id: string) {
    return this.vendorsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a vendor by ID" })
  update(@Param("id") id: string, @Body() updateVendorDto: UpdateVendorDto) {
    return this.vendorsService.update(id, updateVendorDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a vendor by ID" })
  remove(@Param("id") id: string) {
    return this.vendorsService.remove(id);
  }
}
