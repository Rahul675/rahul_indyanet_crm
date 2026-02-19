import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { ClusterService } from "./cluster.service";
import { CreateClusterDto } from "./dto/create-cluster.dto";
import { UpdateClusterDto } from "./dto/update-cluster.dto";
import { ClusterEntity } from "./entities/cluster.entity";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("Clusters")
@UseGuards(JwtAuthGuard)
@Controller("clusters")
export class ClusterController {
  constructor(private readonly clusterService: ClusterService) {}

  @Post()
  @ApiOperation({ summary: "Create cluster" })
  @ApiResponse({ status: 201, type: ClusterEntity })
  create(@Body() dto: CreateClusterDto) {
    return this.clusterService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all clusters" })
  findAll(@Req() req: any) {
    return this.clusterService.findAll(req.user);
  }

  @Get("export")
  @ApiOperation({ summary: "Export clusters to Excel" })
  async exportExcel(@Res() res: Response) {
    const buffer = await this.clusterService.exportExcel();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=clusters_${new Date().getTime()}.xlsx`
    );
    res.send(buffer);
  }

  @Post("import")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Import clusters from Excel" })
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    return this.clusterService.importExcel(file.buffer);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get cluster with loadshares" })
  findOne(@Param("id") id: string) {
    return this.clusterService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update cluster" })
  update(@Param("id") id: string, @Body() dto: UpdateClusterDto) {
    return this.clusterService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete cluster" })
  remove(@Param("id") id: string) {
    return this.clusterService.remove(id);
  }
}
