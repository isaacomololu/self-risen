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

    @ApiProperty({
        description: 'Optional ID of the WheelFocus if this reflection is linked to an active focus',
        example: 'focus-id-456',
        required: false
    })
    @IsString()
    @IsOptional()
    wheelFocusId?: string;

    @ApiProperty({
        description: 'Session duration in days. Defaults to 7 if not provided.',
        example: 7,
        required: false,
        enum: [1, 3, 7, 14, 30]
    })
    @IsInt()
    @IsOptional()
    @IsIn([1, 3, 7, 14, 30])
    @Min(1)
    sessionDurationDays?: number;
}

