import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
} from "@nestjs/common";
import { RechargesService } from "./recharges.service";
import { CreateRechargeDto } from "./dto/create-recharge.dto";
import { UpdateRechargeDto } from "./dto/update-recharge.dto";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { RechargeEntity } from "./entities/recharge.entity";

@ApiTags("Recharges")
@Controller("recharges")
export class RechargesController {
  constructor(private readonly rechargesService: RechargesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new recharge" })
  @ApiResponse({ status: 201, type: RechargeEntity })
  async create(@Body() dto: CreateRechargeDto) {
    const recharge = await this.rechargesService.create(dto);
    return {
      success: true,
      message: "Recharge created successfully",
      data: recharge,
    };
  }

  @Get()
  @ApiOperation({ summary: "Get all recharges or filter by customerId" })
  async findAll(@Query("customerId") customerId?: string) {
    const recharges = customerId
      ? await this.rechargesService.findByCustomer(customerId)
      : await this.rechargesService.findAll();

    return { success: true, count: recharges.length, data: recharges };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a recharge" })
  async update(@Param("id") id: string, @Body() dto: UpdateRechargeDto) {
    const updated = await this.rechargesService.update(id, dto);
    return {
      success: true,
      message: "Recharge updated successfully",
      data: updated,
    };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a recharge" })
  async remove(@Param("id") id: string) {
    const deleted = await this.rechargesService.remove(id);
    return {
      success: true,
      message: "Recharge deleted successfully",
      data: deleted,
    };
  }
}
