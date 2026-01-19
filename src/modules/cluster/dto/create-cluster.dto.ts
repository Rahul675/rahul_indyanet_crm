import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsArray } from "class-validator";

export class CreateClusterDto {
  @ApiProperty({ example: "Noida Sector 62" })
  @IsString()
  name!: string;

  @ApiProperty({ example: "Active" })
  @IsString()
  status!: string;

  @ApiProperty({ 
    example: ["user123", "user456"], 
    description: "Array of operator user IDs assigned to this cluster",
    required: false 
  })
  @IsOptional()
  @IsArray()
  assignedOperators?: string[];
}
