import { IsString, IsNotEmpty, IsOptional, IsInt, IsIn, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
    @ApiProperty({
        description: 'The ID of the Wheel of Life category to reflect on',
        example: 'cat-id-123',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    categoryId: string;
}

