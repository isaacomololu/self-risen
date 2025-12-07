import { IsString, IsNotEmpty, IsInt, IsIn, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWaveDto {
    @ApiProperty({
        description: 'The ID of the reflection session to create a wave for',
        example: 'session-id-123',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    sessionId: string;

    @ApiProperty({
        description: 'Wave duration in days. Defaults to 7 if not provided.',
        example: 7,
        required: false,
        enum: [1, 3, 7, 14, 30]
    })
    @IsInt()
    @IsIn([1, 3, 7, 14, 30])
    @Min(1)
    durationDays?: number;
}
