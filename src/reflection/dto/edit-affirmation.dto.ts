import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditAffirmationDto {
    @ApiProperty({
        description: 'The edited affirmation text (replaces the AI-generated affirmation)',
        example: 'I am capable of managing my finances with calm and clarity.',
        required: true,
        maxLength: 500,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    affirmation: string;
}
