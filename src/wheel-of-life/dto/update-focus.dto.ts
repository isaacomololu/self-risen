import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class UpdateFocusDto {
    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    // @ApiProperty({ required: false })
    // @IsDateString()
    // @IsOptional()
    // completedAt?: string;
}

