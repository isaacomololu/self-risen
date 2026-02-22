import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddVisionToGlobalBoardDto {
    @ApiProperty({
        description: 'The ID of the vision to duplicate onto the global board',
        example: 'vision-id-123',
        required: true,
    })
    @IsString()
    visionId: string;
}
