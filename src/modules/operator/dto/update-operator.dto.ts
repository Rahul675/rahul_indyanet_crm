import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsEmail, IsOptional, IsString } from "class-validator";

export class UpdateOperatorDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  assignedClusters?: string[];
}
