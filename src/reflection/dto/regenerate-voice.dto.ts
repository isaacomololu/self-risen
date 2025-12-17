import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TtsVoicePreference } from '@prisma/client';

export class RegenerateVoiceDto {
    @ApiProperty({
        required: false,
        enum: TtsVoicePreference,
        description: 'Optional voice preference for regeneration. If not provided, uses user\'s saved preference.',
        example: 'FEMALE'
    })
    @IsOptional()
    @IsEnum(TtsVoicePreference)
    voicePreference?: TtsVoicePreference;
}

