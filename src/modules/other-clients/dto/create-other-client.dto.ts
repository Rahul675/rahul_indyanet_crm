import { IsOptional, IsString, IsNotEmpty } from "class-validator";

export class CreateOtherClientDto {
  @IsNotEmpty()
  @IsString()
  site!: string;

  @IsOptional() @IsString() publicIp1?: string;
  @IsOptional() @IsString() publicIp2?: string;
  @IsOptional() @IsString() isp1?: string;
  @IsOptional() @IsString() isp2?: string;
  @IsOptional() @IsString() lanIp?: string;
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() @IsString() macId?: string;
  @IsOptional() @IsString() landlineWifiId?: string;
  @IsOptional() @IsString() speedMbps?: string;
  @IsOptional() @IsString() internetInstallation?: string;
  @IsOptional() @IsString() prevBillReceived?: string;
  @IsOptional() @IsString() dispatchDate?: string;
  @IsOptional() @IsString() reachedDayDate?: string;
  @IsOptional() @IsString() installationDate?: string;
  @IsOptional() @IsString() aValue?: string;
  @IsOptional() @IsString() contactNo?: string;
  @IsOptional() @IsString() dvrConnected?: string;
  @IsOptional() @IsString() simNo?: string;
}
