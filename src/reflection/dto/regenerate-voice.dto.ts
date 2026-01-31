import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class RegenerateVoiceDto {
    @ApiProperty({
        required: false,
        type: 'string',
        enum: ['Marcus', 'Daniel', 'Sophia', 'Maya', 'Alex', 'River'],
        enumName: 'PersonaName',
        description: 'Optional voice persona name for regeneration. If not provided, uses user\'s saved preference.\n\n' +
                     '**Available Personas:**\n' +
                     '- **Marcus** (Confident Coach - Male): Deep, authoritative voice\n' +
                     '- **Daniel** (Friendly Guide - Male): Warm, conversational voice\n' +
                     '- **Sophia** (Empathetic Mentor - Female): Nurturing, compassionate voice\n' +
                     '- **Maya** (Energetic Motivator - Female): Upbeat, vibrant voice\n' +
                     '- **Alex** (Calm Companion - Androgynous): Balanced, neutral voice\n' +
                     '- **River** (Wise Advisor - Androgynous): Thoughtful, mature voice',
        example: 'Sophia'
    })
    @IsOptional()
    @IsString()
    @IsIn(['Marcus', 'Daniel', 'Sophia', 'Maya', 'Alex', 'River'])
    voicePreference?: string;
}

