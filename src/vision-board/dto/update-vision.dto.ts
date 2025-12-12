import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVisionDto {
    @ApiProperty({
        description: 'The ID of the reflection session to link to the vision (optional)',
        example: 'reflection-session-id-123',
        required: false,
    })
    @IsString()
    @IsOptional()
    reflectionSessionId?: string;
}

