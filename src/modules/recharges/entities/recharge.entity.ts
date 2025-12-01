import { ApiProperty } from "@nestjs/swagger";

export class RechargeEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  planType!: string;

  @ApiProperty()
  rechargeDate!: Date;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  validityDays!: number;

  @ApiProperty()
  expiryDate!: Date;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
