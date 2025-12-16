import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  ForbiddenException,
  Req,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { OtherClientsService } from "./other-clients.service";
import { CreateOtherClientDto } from "./dto/create-other-client.dto";
import { UpdateOtherClientDto } from "./dto/update-other-client.dto";
import { ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("other-clients")
export class OtherClientsController {
  constructor(private readonly service: OtherClientsService) {}

  @Post()
  create(@Body() dto: CreateOtherClientDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query("search") search?: string) {
    return this.service.findAll(search);
  }

  /* ----------------------- Delete All ----------------------- */
  @UseGuards(JwtAuthGuard) // 2. Make sure the Guard is applied!
  @Delete("clear/all")
  @ApiOperation({ summary: "Delete ALL Other Client records" })
  async clearAll(@Req() req: Request) {
    // 3. Cast req as 'any' to access the user object added by Passport/JWT
    const user = (req as any).user;

    if (!user || user.role !== "admin") {
      throw new ForbiddenException("Only admins can perform bulk deletion");
    }

    const result = await this.service.clearAll();
    return {
      success: true,
      message: "🧹 All records deleted successfully",
      count: result.count,
    };
  }

  /* ----------------------- EXCEL ENDPOINTS ----------------------- */

  @Get("export/excel")
  async exportExcel(@Res() res: Response) {
    const buffer = await this.service.exportExcel();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=OtherClients_${new Date().getTime()}.xlsx`
    );
    res.send(buffer);
  }

  @Post("import/excel")
  @UseInterceptors(FileInterceptor("file"))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    return this.service.importExcel(file.buffer);
  }

  /* -------------------------------------------------------------- */

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateOtherClientDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
