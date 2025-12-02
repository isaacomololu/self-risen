import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddVisionDto {
    @ApiProperty({
        description: 'The ID of the reflection session to add to the vision board',
        example: 'reflection-session-id-123',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    reflectionSessionId: string;
}

