import {
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  IsDefined,
} from "class-validator";

export class CreateOtherClientDto {
  @IsDefined()
  @IsString()
  site!: string; // ✅ required

  @IsOptional()
  @IsString()
  lanIp?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  macId?: string;

  @IsOptional()
  @IsString()
  landlineWifiId?: string;

  @IsOptional()
  @IsInt()
  speedMbps?: number;

  @IsOptional()
  @IsString()
  internet?: string;

  @IsOptional()
  @IsString()
  installation?: string;

  @IsOptional()
  @IsNumber()
  previousInternetBill?: number;

  @IsOptional()
  @IsString()
  received?: string;

  @IsOptional()
  @IsString()
  dispatch?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  reachedDay?: string;

  @IsOptional()
  @IsString()
  installationDate?: string;

  @IsOptional()
  @IsString()
  aSpoke?: string;

  @IsOptional()
  @IsString()
  contactNo?: string;

  @IsOptional()
  @IsString()
  dvrConnected?: string;

  @IsOptional()
  @IsString()
  simNo?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  deviceLicense?: string;
}
