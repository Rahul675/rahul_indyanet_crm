import { IsString, IsOptional, IsDateString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateIssueDto {
  @ApiProperty({ example: "cluster-123", description: "Cluster ID" })
  @IsOptional()
  @IsString()
  clusterId?: string;

  @ApiProperty({ example: "loadshare-456", description: "LoadShare/Location ID" })
  @IsOptional()
  @IsString()
  loadshareId?: string;

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

  @ApiProperty({ example: "op-user-123", required: false, description: "Operator ID to assign to" })
  @IsOptional()
  @IsString()
  assignee?: string;

  @ApiProperty({ example: "op-resolver-456", required: false, description: "Operator ID who resolved the issue" })
  @IsOptional()
  @IsString()
  resolvedBy?: string;

  @ApiProperty({ example: "2025-10-31T00:00:00.000Z", required: false })
  @IsOptional()
  @IsDateString()
  resolvedDate?: string;

  @ApiProperty({ example: "Restarted the router", required: false })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
