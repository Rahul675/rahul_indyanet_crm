import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
} from "class-validator";

export class CreateRechargeDto {
  @ApiProperty()
  @IsString()
  clusterId!: string;

  @ApiProperty()
  @IsString()
  loadshareId!: string;

  @ApiProperty()
  @IsString()
  planType!: string;

  @ApiProperty()
  @IsDateString()
  rechargeDate!: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiProperty()
  @IsInt()
  validityDays!: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  remarks?: string;
}
