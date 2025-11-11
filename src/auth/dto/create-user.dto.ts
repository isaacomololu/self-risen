import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SignUp {
    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsString()
    name: string;

    // @ApiProperty({ required: true })
    // @IsNotEmpty()
    // @IsString()
    // lastName: string;

    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsString()
    password: string;

    @ApiProperty({ required: true })
    @IsOptional()
    @IsString()
    avatar: string;
}
