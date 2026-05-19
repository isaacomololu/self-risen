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
        description: 'Background music key from stater-videos music list',
        example: 'meditation',
    })
    @IsString()
    @IsNotEmpty()
    backgroundMusicKey: string;

    @ApiProperty({
        description: 'Optional voice persona name or enum for affirmations missing audio or with a different voice',
        required: false,
        example: 'Sage',
    })
    @IsOptional()
    @IsString()
    voicePreference?: string;
}
