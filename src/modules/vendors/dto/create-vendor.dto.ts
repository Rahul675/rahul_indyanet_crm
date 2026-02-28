import { IsString, IsDateString, IsOptional, IsObject } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateVendorDto {
  @ApiProperty({ example: "Acme Fiber" })
  @IsString()
  vendorName!: string;

  @ApiProperty({ example: "+91-9876543210" })
  @IsString()
  contactNumber!: string;

  @ApiProperty({ example: "Bandwidth Supply" })
  @IsString()
  servicesType!: string;

  @ApiProperty({ example: "Cash", required: false })
  @IsOptional()
  @IsString()
  paymentMode?: string;

  @ApiProperty({ example: "Active", required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    example: "2025-10-31T00:00:00.000Z",
    description: "ISO formatted date",
  })
  @IsDateString()
  onboardDate!: string;

  @ApiProperty({
    example: {
      "Email Address": "vendor@example.com",
      "Secondary Phone": "+91-9876543210",
      "Address": "123 Main St, City, State",
      "Account Manager": "John Doe",
    },
    required: false,
    description: "Additional optional information as key-value pairs",
  })
  @IsOptional()
  @IsObject()
  additionalInfo?: Record<string, string>;
}
