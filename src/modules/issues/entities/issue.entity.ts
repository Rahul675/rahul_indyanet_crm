import { ApiProperty } from "@nestjs/swagger";

export class IssueEntity {
  @ApiProperty({ example: "clw9t2azc0000w1n5ey9ltya4" })
  id!: string;

  @ApiProperty({ example: "cmhejcoi40000rqqbwcs5i9us" })
  customerId!: string;

  @ApiProperty({ example: "cluster-123", description: "Cluster ID", required: false })
  clusterId?: string;

  @ApiProperty({ example: "loadshare-456", description: "LoadShare/Location ID", required: false })
  loadshareId?: string;

  @ApiProperty({ example: "Speed" })
  category!: string;

  @ApiProperty({ example: "Internet speed issue" })
  description!: string;

  @ApiProperty({ example: "Pending" })
  status!: string;

  @ApiProperty({ example: "op-user-123", description: "Operator ID assigned", required: false })
  assignee?: string;

  @ApiProperty({ example: "2025-10-31T09:30:00Z" })
  createdDate!: Date;

  @ApiProperty({ example: "2025-11-02T09:30:00Z", required: false })
  resolvedDate?: Date;

  @ApiProperty({ example: "Router replaced and speed improved", required: false })
  resolutionNotes?: string;

  @ApiProperty({ example: "2025-11-02T09:30:00Z" })
  updatedAt!: Date;
}
