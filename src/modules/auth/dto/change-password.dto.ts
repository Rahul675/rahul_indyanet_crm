import { IsString, MinLength, IsNotEmpty } from "class-validator";

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @IsString()
  @MinLength(6, { message: "New password must be at least 6 characters long" })
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword!: string;
}
