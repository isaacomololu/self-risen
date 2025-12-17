import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsEnum } from "class-validator";
import { TtsVoicePreference } from "@prisma/client";

export class ChangeTtsVoicePreferenceDto {
    @ApiProperty({ 
        required: true,
        enum: TtsVoicePreference,
        description: 'Voice preference for text-to-speech: MALE, FEMALE, or ANDROGYNOUS',
        example: 'FEMALE'
    })
    @IsNotEmpty()
    @IsEnum(TtsVoicePreference)
    ttsVoicePreference: TtsVoicePreference;
}

