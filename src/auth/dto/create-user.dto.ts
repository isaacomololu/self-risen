import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

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

    // @ApiProperty({ required: true })
    // @IsNotEmpty()
    // @IsString()
    // avatar: string;

    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsString()
    @Matches(/^\+[1-9]\d{1,14}$/, {
        message: 'Phone number must be in E.164 format (e.g., +1234567890)'
    })
    phone: string;

    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsString()
    address: string;
}
