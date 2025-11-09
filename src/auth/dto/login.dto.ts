import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsString()
    token: string;
}