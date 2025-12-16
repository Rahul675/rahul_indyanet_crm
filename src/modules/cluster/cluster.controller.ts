import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ClusterService } from "./cluster.service";
import { CreateClusterDto } from "./dto/create-cluster.dto";
import { UpdateClusterDto } from "./dto/update-cluster.dto";
import { ClusterEntity } from "./entities/cluster.entity";

@ApiTags("Clusters")
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
  findAll() {
    return this.clusterService.findAll();
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
