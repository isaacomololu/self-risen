import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAffirmationLoopDto {
    @ApiProperty({
        description: 'Affirmation IDs in playback order',
        type: [String],
        minItems: 1,
        maxItems: 20,
    })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(20)
    @IsUUID('4', { each: true })
    affirmationIds: string[];

    @ApiProperty({
        description:
            'Background music name from GET /stater-videos/music (must match a list item name exactly)',
        example: 'meditation',
    })
    @IsString()
    @IsNotEmpty()
    backgroundMusicKey: string;

    @ApiProperty({
        description:
            'Optional TTS voice for affirmations missing audio or with a different voice. Accepts a persona name (e.g. Sage) or TtsVoicePreference enum value.',
        required: false,
        example: 'FEMALE_EMPATHETIC',
    })
    @IsOptional()
    @IsString()
    voicePreference?: string;
}
