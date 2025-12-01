import { IsString, IsOptional, IsDateString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateIssueDto {
  @ApiProperty({ example: "cmhejcoi40000rqqbwcs5i9us" })
  @IsString()
  customerId!: string;

  @ApiProperty({ example: "Speed" })
  @IsString()
  category!: string;

  @ApiProperty({ example: "Internet speed is too slow" })
  @IsString()
  description!: string;

  @ApiProperty({ example: "Pending", required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: "Rahul", required: false })
  @IsOptional()
  @IsString()
  assignee?: string;

  @ApiProperty({ example: "2025-10-31T00:00:00.000Z", required: false })
  @IsOptional()
  @IsDateString()
  resolvedDate?: string;

  @ApiProperty({ example: "Restarted the router" })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
