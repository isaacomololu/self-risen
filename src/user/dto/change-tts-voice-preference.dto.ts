import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsIn } from "class-validator";

export class ChangeTtsVoicePreferenceDto {
    @ApiProperty({ 
        required: true,
        type: 'string',
        enum: ['Marcus', 'Daniel', 'Sophia', 'Maya', 'Alex', 'River'],
        enumName: 'PersonaName',
        description: 'Voice persona name for text-to-speech affirmations. Available personas:\n\n' +
                     '**Male Personas:**\n' +
                     '- **Marcus** (Confident Coach - Male): Deep, authoritative voice that commands attention. Personality: authoritative, grounding, powerful, commanding.\n' +
                     '- **Daniel** (Friendly Guide - Male): Warm, conversational voice that feels approachable. Personality: approachable, supportive, encouraging, relatable.\n\n' +
                     '**Female Personas:**\n' +
                     '- **Sophia** (Empathetic Mentor - Female): Nurturing, warm voice that radiates compassion. Personality: nurturing, compassionate, understanding, gentle.\n' +
                     '- **Maya** (Energetic Motivator - Female): Upbeat, vibrant voice that inspires action. Personality: upbeat, vibrant, motivating, enthusiastic.\n\n' +
                     '**Androgynous Personas:**\n' +
                     '- **Alex** (Calm Companion - Androgynous): Balanced, neutral voice that brings steadiness. Personality: balanced, neutral, steady, peaceful.\n' +
                     '- **River** (Wise Advisor - Androgynous): Thoughtful, mature voice that conveys wisdom. Personality: thoughtful, mature, grounded, insightful.',
        example: 'Sophia'
    })
    @IsNotEmpty()
    @IsString()
    @IsIn(['Marcus', 'Daniel', 'Sophia', 'Maya', 'Alex', 'River'])
    ttsVoicePreference: string;
}

