import { IsNotEmpty, IsOptional, IsString, IsArray } from "class-validator";

export class CreateOtherClientGroupDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedOperators?: string[];
}
