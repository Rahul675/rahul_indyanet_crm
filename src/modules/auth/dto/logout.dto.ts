import { IsOptional, IsString, MinLength } from "class-validator";

export class LogoutDto {
  @IsOptional()
  @IsString()
  @MinLength(30, {
    message: "Logout reason must be at least 30 characters for operators",
  })
  reason?: string;
}
