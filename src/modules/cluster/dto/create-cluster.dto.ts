import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class CreateClusterDto {
  @ApiProperty({ example: "CL-NOIDA-62" })
  @IsString()
  code!: string;

  @ApiProperty({ example: "Noida Sector 62" })
  @IsString()
  name!: string;

  @ApiProperty({ example: "Uttar Pradesh" })
  @IsString()
  state!: string;

  @ApiProperty({ example: "Active" })
  @IsString()
  status!: string;
}
