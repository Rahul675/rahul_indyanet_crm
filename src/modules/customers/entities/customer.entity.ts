import { ApiProperty } from "@nestjs/swagger";

export class CustomerEntity {
  @ApiProperty({ example: "clw9t2azc0000w1n5ey9ltya4" })
  id!: string;

  @ApiProperty({ example: "CUST-9702" })
  customerCode!: string;

  @ApiProperty({ example: "Rahul Tomer" })
  fullName!: string;

  @ApiProperty({ example: "+91-9876543210" })
  contactNumber!: string;

  @ApiProperty({ example: "200 Mbps" })
  servicesType!: string;

  @ApiProperty({ example: "Cash" })
  paymentMode?: string;

  @ApiProperty({ example: "Active" })
  connectionStatus!: string;

  @ApiProperty({ example: "2025-10-31" })
  installDate!: Date;

  @ApiProperty({ example: "2025-10-31T10:12:00Z" })
  createdAt!: Date;

  @ApiProperty({ example: "2025-10-31T11:00:00Z" })
  updatedAt!: Date;
}
