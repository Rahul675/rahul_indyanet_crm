import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { IssuesService } from "./issues.service";
import { CreateIssueDto } from "./dto/create-issue.dto";
import { UpdateIssueDto } from "./dto/update-issue.dto";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { IssueEntity } from "./entities/issue.entity";
import { AuthGuard } from "@nestjs/passport";

@ApiTags("Issues")
@Controller("issues")
@UseGuards(AuthGuard("jwt"))
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new issue" })
  @ApiResponse({ status: 201, type: IssueEntity })
  async create(@Body() createIssueDto: CreateIssueDto, @Req() req: any) {
    const user = req.user; // <--- important
    return this.issuesService.create(createIssueDto, user);
  }

  @Get()
  @ApiOperation({ summary: "Get all issues" })
  @ApiResponse({ status: 200, type: [IssueEntity] })
  async findAll(@Query("clusterId") clusterId?: string, @Query("loadshareId") loadshareId?: string) {
    const issues = await this.issuesService.findAll(clusterId, loadshareId);
    return { count: issues.length, items: issues };
  }

  @Get("data/clusters")
  @ApiOperation({ summary: "Get all clusters for the current user" })
  async getClusters(@Req() req: any) {
    const clusters = await this.issuesService.getClusters(req.user);
    return { count: clusters.length, items: clusters };
  }

  @Get("data/locations/:clusterId")
  @ApiOperation({ summary: "Get all locations (loadshares) for a cluster" })
  async getLocationsByCluster(@Param("clusterId") clusterId: string) {
    const locations = await this.issuesService.getLocationsByCluster(clusterId);
    return { count: locations.length, items: locations };
  }

  @Get("data/operators/:clusterId")
  @ApiOperation({ summary: "Get all operators assigned to a cluster" })
  async getOperatorsByCluster(@Param("clusterId") clusterId: string) {
    const operators = await this.issuesService.getOperatorsByCluster(clusterId);
    return { count: operators.length, items: operators };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single issue by ID" })
  async findOne(@Param("id") id: string) {
    return this.issuesService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an issue" })
  async update(
    @Param("id") id: string,
    @Body() updateIssueDto: UpdateIssueDto,
    @Req() req: any
  ) {
    const user = req.user;
    return this.issuesService.update(id, updateIssueDto, user);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an issue" })
  async remove(@Param("id") id: string, @Req() req: any) {
    const user = req.user;
    return this.issuesService.remove(id, user);
  }
}
