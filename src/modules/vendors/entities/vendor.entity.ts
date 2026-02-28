import { ApiProperty } from "@nestjs/swagger";

export class VendorEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  vendorName!: string;

  @ApiProperty()
  contactNumber!: string;

  @ApiProperty()
  servicesType!: string;

  @ApiProperty({ required: false })
  paymentMode?: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  onboardDate!: Date;

  @ApiProperty()
  vendorCode!: string;

  @ApiProperty({ required: false })
  additionalInfo?: Record<string, string>;
}
