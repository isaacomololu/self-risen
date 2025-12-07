import { ApiProperty } from '@nestjs/swagger';

export class ReflectionSessionResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    userId: string;

    @ApiProperty()
    categoryId: string;

    @ApiProperty({ required: false })
    wheelFocusId?: string;

    @ApiProperty()
    prompt: string;

    @ApiProperty({ required: false })
    rawBeliefText?: string;

    @ApiProperty({ required: false })
    audioUrl?: string;

    @ApiProperty({ required: false })
    transcriptionText?: string;

    @ApiProperty({ required: false })
    limitingBelief?: string;

    @ApiProperty({ required: false })
    generatedAffirmation?: string;

    @ApiProperty({ required: false })
    approvedAffirmation?: string;

    @ApiProperty({ enum: ['PENDING', 'BELIEF_CAPTURED', 'AFFIRMATION_GENERATED', 'APPROVED', 'COMPLETED'] })
    status: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty({ required: false })
    completedAt?: Date;

    @ApiProperty({ required: false, description: 'Active wave for this session' })
    waves?: Array<{
        id: string;
        sessionId: string;
        startDate: Date;
        endDate: Date;
        durationDays: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;

    @ApiProperty({ required: false })
    aiAffirmationAudioUrl?: string;

    @ApiProperty({ required: false })
    userAffirmationAudioUrl?: string;

    @ApiProperty({ required: false })
    playbackCount?: number;

    @ApiProperty({ required: false })
    lastPlayedAt?: Date;

    @ApiProperty({ required: false })
    beliefRerecordedAt?: Date;

    @ApiProperty({ required: false })
    beliefRerecordCount?: number;

    @ApiProperty({ required: false, description: 'Computed field - priority audio URL (user recording > AI TTS)' })
    affirmationAudioUrl?: string;

    @ApiProperty({ required: false })
    category?: {
        id: string;
        name: string;
    };
}

