import { ApiProperty } from "@nestjs/swagger";

export class IssueEntity {
  @ApiProperty({ example: "clw9t2azc0000w1n5ey9ltya4" })
  id!: string;

  @ApiProperty({ example: "cmhejcoi40000rqqbwcs5i9us" })
  customerId!: string;

  @ApiProperty({ example: "Speed" })
  category!: string;

  @ApiProperty({ example: "Internet speed issue" })
  description!: string;

  @ApiProperty({ example: "Pending" })
  status!: string;

  @ApiProperty({ example: "Rahul" })
  assignee?: string;

  @ApiProperty({ example: "2025-10-31T09:30:00Z" })
  createdDate!: Date;

  @ApiProperty({ example: "2025-11-02T09:30:00Z" })
  resolvedDate?: Date;

  @ApiProperty({ example: "Router replaced and speed improved" })
  resolutionNotes?: string;
}
