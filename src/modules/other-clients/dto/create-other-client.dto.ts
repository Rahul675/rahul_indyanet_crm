import { IsOptional, IsString, IsNotEmpty } from "class-validator";

export class CreateOtherClientSiteDto {
  @IsNotEmpty()
  @IsString()
  groupId!: string;

  @IsNotEmpty()
  @IsString()
  site!: string;

  @IsOptional() @IsString() lanIp?: string;
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() @IsString() macId?: string;
  @IsOptional() @IsString() landlineWifiId?: string;
  @IsOptional() @IsString() speedMbps?: string;
  @IsOptional() @IsString() internet?: string;
  @IsOptional() @IsString() installation?: string;
  @IsOptional() @IsString() internetInstallation?: string;
  @IsOptional() @IsString() prevBillReceived?: string;
  @IsOptional() @IsString() received?: string;
  @IsOptional() @IsString() dispatch?: string;
  @IsOptional() @IsString() dispatchDate?: string;
  @IsOptional() @IsString() reachedDay?: string;
  @IsOptional() @IsString() installationDate?: string;
  @IsOptional() @IsString() aValue?: string;
  @IsOptional() @IsString() aSpoke?: string;
  @IsOptional() @IsString() contactNo?: string;
  @IsOptional() @IsString() dvrConnected?: string;
  @IsOptional() @IsString() simNo?: string;
  @IsOptional() @IsString() deviceName?: string;
  @IsOptional() @IsString() deviceLicense?: string;
}

// Keep backward compatibility alias
export { CreateOtherClientSiteDto as CreateOtherClientDto };

