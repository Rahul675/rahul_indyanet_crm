import { IsString, IsDateString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateCustomerDto {
  @ApiProperty({ example: "Rahul Tomer" })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: "+91-9876543210" })
  @IsString()
  contactNumber!: string;

  @ApiProperty({ example: "200 Mbps" })
  @IsString()
  planType!: string;

  @ApiProperty({ example: "Active", required: false })
  @IsOptional()
  @IsString()
  connectionStatus?: string;

  @ApiProperty({
    example: "2025-10-31T00:00:00.000Z",
    description: "ISO formatted date",
  })
  @IsDateString()
  installDate!: string;
}
