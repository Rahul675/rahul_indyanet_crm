import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
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
import { CreateOtherClientGroupDto } from "./dto/create-other-client-group.dto";
import { UpdateOtherClientGroupDto } from "./dto/update-other-client-group.dto";
import { CreateOtherClientSiteDto } from "./dto/create-other-client.dto";
import { UpdateOtherClientSiteDto } from "./dto/update-other-client.dto";
import { ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("other-clients")
@UseGuards(JwtAuthGuard)
export class OtherClientsController {
  constructor(private readonly service: OtherClientsService) {}

  /* ======================= GROUP ENDPOINTS ======================= */

  @Post("groups")
  createGroup(@Body() dto: CreateOtherClientGroupDto) {
    return this.service.createGroup(dto);
  }

  @Get("groups")
  findAllGroups() {
    return this.service.findAllGroups();
  }

  @Get("groups/:id")
  findOneGroup(@Param("id") id: string) {
    return this.service.findOneGroup(id);
  }

  @Patch("groups/:id")
  updateGroup(@Param("id") id: string, @Body() dto: UpdateOtherClientGroupDto) {
    return this.service.updateGroup(id, dto);
  }

  @Delete("groups/:id")
  @ApiOperation({ summary: "Delete a group and all its sites" })
  async removeGroup(@Param("id") id: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!user || user.role !== "admin") {
      throw new ForbiddenException("Only admins can delete groups");
    }
    return this.service.removeGroup(id);
  }

  /* ======================= SITE ENDPOINTS ======================= */

  @Post("sites")
  createSite(@Body() dto: CreateOtherClientSiteDto) {
    return this.service.createSite(dto);
  }

  @Get("sites")
  findAllSites(
    @Query("groupId") groupId: string,
    @Query("search") search?: string
  ) {
    if (!groupId) throw new BadRequestException("groupId is required");
    return this.service.findAllSites(groupId, search);
  }

  @Get("sites/:id")
  findOneSite(@Param("id") id: string) {
    return this.service.findOneSite(id);
  }

  @Patch("sites/:id")
  updateSite(@Param("id") id: string, @Body() dto: UpdateOtherClientSiteDto) {
    return this.service.updateSite(id, dto);
  }

  @Delete("sites/:id")
  removeSite(@Param("id") id: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!user || user.role !== "admin") {
      throw new ForbiddenException("Only admins can delete sites");
    }
    return this.service.removeSite(id);
  }

  /* ----------------------- Clear All Sites in Group ----------------------- */
  @Delete("sites/clear/:groupId")
  @ApiOperation({ summary: "Delete ALL sites in a group" })
  async clearAllSites(@Param("groupId") groupId: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!user || user.role !== "admin") {
      throw new ForbiddenException("Only admins can perform bulk deletion");
    }

    const result = await this.service.clearAllSites(groupId);
    return {
      success: true,
      message: "🧹 All sites deleted successfully",
      count: result.count,
    };
  }

  /* ======================= EXCEL ENDPOINTS ======================= */

  @Get("export/excel/:groupId")
  async exportExcel(@Param("groupId") groupId: string, @Res() res: Response) {
    const buffer = await this.service.exportExcel(groupId);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=OtherClientSites_${new Date().getTime()}.xlsx`
    );
    res.send(buffer);
  }

  @Post("import/excel/:groupId")
  @UseInterceptors(FileInterceptor("file"))
  async importExcel(
    @Param("groupId") groupId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    return this.service.importExcel(file.buffer, groupId);
  }
}
