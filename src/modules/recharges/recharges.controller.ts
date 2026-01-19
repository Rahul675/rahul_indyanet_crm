import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { RechargesService } from "./recharges.service";
import { CreateRechargeDto } from "./dto/create-recharge.dto";
import { UpdateRechargeDto } from "./dto/update-recharge.dto";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { RechargeEntity } from "./entities/recharge.entity";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("Recharges")
@UseGuards(JwtAuthGuard)
@Controller("recharges")
export class RechargesController {
  constructor(private readonly rechargesService: RechargesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new recharge" })
  @ApiResponse({ status: 201, type: RechargeEntity })
  async create(@Req() req: any, @Body() dto: CreateRechargeDto) {
    return this.rechargesService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: "Get all recharges or filter by customerId" })
  async findAll(
    @Req() req: any,
    @Query("clusterId") clusterId?: string,
    @Query("loadshareId") loadshareId?: string,
    @Query("limit") limit?: string
  ) {
    const recharges = await this.rechargesService.findAll(req.user, {
      clusterId,
      loadshareId,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { count: recharges.length, items: recharges };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a recharge" })
  async update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateRechargeDto) {
    return this.rechargesService.update(id, dto, req.user);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a recharge" })
  async remove(@Req() req: any, @Param("id") id: string) {
    return this.rechargesService.remove(id, req.user);
  }
}
