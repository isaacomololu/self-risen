import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ResetPasswordDto {
    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsString()
    newPassword: string;

    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsString()
    token: string;
}