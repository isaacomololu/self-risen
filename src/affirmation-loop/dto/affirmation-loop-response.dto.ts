import { ApiProperty } from '@nestjs/swagger';
import { AffirmationLoopStatus, TtsVoicePreference } from '@prisma/client';

export class AffirmationLoopResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty({ enum: AffirmationLoopStatus })
    status: AffirmationLoopStatus;

    @ApiProperty({ required: false, nullable: true })
    audioUrl?: string | null;

    @ApiProperty({ required: false, nullable: true })
    durationSeconds?: number | null;

    @ApiProperty()
    backgroundMusicKey: string;

    @ApiProperty({ required: false, nullable: true, enum: TtsVoicePreference })
    voicePreference?: TtsVoicePreference | null;

    @ApiProperty({ type: [String] })
    affirmationIds: string[];

    @ApiProperty({ required: false, nullable: true })
    errorMessage?: string | null;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
