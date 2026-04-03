import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CreateOperatorDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  assignedClusters?: string[];
}
