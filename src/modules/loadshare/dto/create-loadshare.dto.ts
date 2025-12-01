import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsInt,
  IsNumber,
  IsDateString,
  IsOptional,
} from "class-validator";

export class CreateLoadShareDto {
  @ApiProperty() @IsString() nameOfLocation!: string;
  @ApiProperty() @IsString() address!: string;
  @ApiProperty() @IsString() state!: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  circuitId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() isp?: string;
  @ApiProperty() @IsString() rtNumber!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() invoice?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() speed?: string;
  @ApiProperty() @IsString() status!: string;
  @ApiProperty() @IsInt() validity!: number;
  @ApiProperty() @IsString() paidBy!: string;
  @ApiProperty() @IsDateString() activationDate!: string;
  @ApiProperty() @IsDateString() expiryDate!: string;
  @ApiProperty() @IsNumber() installationCharges!: number;
  @ApiProperty() @IsNumber() internetCharges!: number;
  @ApiProperty() @IsNumber() gstPercent!: number;

  // 🧮 Computed automatically in the service — make them optional
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  gstAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  totalPayable?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  requestedBy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  approvedFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  wifiOrNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hubSpocName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hubSpocNumber?: string;
}
