import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsIn } from "class-validator";

export class ChangeTtsVoicePreferenceDto {
    @ApiProperty({ 
        required: true,
        type: 'string',
        enum: ['Sage', 'Phoenix', 'River', 'Quinn', 'Alex', 'Robin'],
        enumName: 'PersonaName',
        description: 'Voice persona name for text-to-speech affirmations. Available: Sage (Empathetic Mentor), Phoenix (Energetic Motivator), River (Confident Coach), Quinn (Friendly Guide), Alex (Calm Companion), Robin (Wise Advisor).',
        example: 'Sage'
    })
    @IsNotEmpty()
    @IsString()
    @IsIn(['Sage', 'Phoenix', 'River', 'Quinn', 'Alex', 'Robin'])
    ttsVoicePreference: string;
}

