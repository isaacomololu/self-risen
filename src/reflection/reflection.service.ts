import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseProvider } from 'src/database/database.provider';
import { BaseService } from 'src/common';
import { StorageService, FileType } from 'src/common/storage/storage.service';
import { TranscriptionService } from './services/transcription.service';
import { NlpTransformationService } from './services/nlp-transformation.service';
import { TextToSpeechService } from './services/text-to-speech.service';
import { CreateSessionDto, SubmitBeliefDto, ReRecordBeliefDto } from './dto';

@Injectable()
export class ReflectionService extends BaseService {
    private readonly logger = new Logger(ReflectionService.name);

    // Category name to prompt mapping
    private readonly PROMPT_MAPPING: Record<string, string> = {
        'Finances': 'Money is...',
        'Finance': 'Money is...',
        'Relationships': 'Love is...',
        'Relationship': 'Love is...',
        'Health & Well-being': 'My body is...',
        'Health': 'My body is...',
        'Career / Work': 'My work is...',
        'Career': 'My work is...',
        'Work': 'My work is...',
        'Personal Growth': 'I am...',
        'Personal Development': 'I am...',
        'Leisure & Fun': 'Fun is...',
        'Leisure': 'Fun is...',
        'Environment': 'My environment is...',
        'Spirituality / Mindfulness': 'Spirituality is...',
        'Spirituality': 'Spirituality is...',
        'Mindfulness': 'Mindfulness is...',
    };

    constructor(
        private prisma: DatabaseProvider,
        private storageService: StorageService,
        private transcriptionService: TranscriptionService,
        private nlpTransformationService: NlpTransformationService,
        private textToSpeechService: TextToSpeechService,
    ) {
        super();
    }

    /**
     * Create a new reflection session
     */
    async createSession(firebaseId: string, dto: CreateSessionDto) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        const category = await this.validateCategoryOwnership(user.id, dto.categoryId);
        if (!category) {
            return this.HandleError(new NotFoundException('Category not found or does not belong to user'));
        }

        if (dto.wheelFocusId) {
            const wheelFocus = await this.prisma.wheelFocus.findFirst({
                where: {
                    id: dto.wheelFocusId,
                    wheel: { userId: user.id },
                    categoryId: dto.categoryId,
                },
            });

            if (!wheelFocus) {
                return this.HandleError(new NotFoundException('WheelFocus not found or does not match category'));
            }
        }

        const prompt = this.generatePrompt(category.name);

        const sessionDurationDays = dto.sessionDurationDays || 7; // Default to 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + sessionDurationDays);

        // Create reflection session
        const session = await this.prisma.reflectionSession.create({
            data: {
                userId: user.id,
                categoryId: dto.categoryId,
                wheelFocusId: dto.wheelFocusId,
                prompt,
                sessionDurationDays,
                expiresAt,
                status: 'PENDING',
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Add computed affirmationAudioUrl field
        const sessionWithAudio = {
            ...session,
            affirmationAudioUrl: this.getAffirmationAudioUrl(session),
        };

        return this.Results(sessionWithAudio);
    }

    async getSessionById(firebaseId: string, sessionId: string) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        const session = await this.prisma.reflectionSession.findFirst({
            where: {
                id: sessionId,
                userId: user.id,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!session) {
            return this.HandleError(new NotFoundException('Reflection session not found'));
        }

        // Add computed affirmationAudioUrl field
        const sessionWithAudio = {
            ...session,
            affirmationAudioUrl: this.getAffirmationAudioUrl(session),
        };

        return this.Results(sessionWithAudio);
    }

    async getAllSessions(firebaseId: string) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        const sessions = await this.prisma.reflectionSession.findMany({
            where: { userId: user.id },
        });

        return this.Results(sessions);
    }
    /**
     * Submit belief (text or audio) for a reflection session
     */
    async submitBelief(
        firebaseId: string,
        sessionId: string,
        dto: SubmitBeliefDto,
        audioFile?: Express.Multer.File,
    ) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        // Validate session ownership and status
        const session = await this.prisma.reflectionSession.findFirst({
            where: {
                id: sessionId,
                userId: user.id,
            },
        });

        if (!session) {
            return this.HandleError(new NotFoundException('Reflection session not found'));
        }

        if (session.status !== 'PENDING') {
            return this.HandleError(
                new BadRequestException('Belief has already been submitted for this session'),
            );
        }

        let rawBeliefText: string | undefined;
        let audioUrl: string | undefined;
        let transcriptionText: string | undefined;

        // Handle audio file upload and transcription
        if (audioFile) {
            try {
                // Upload audio file
                const uploadResult = await this.storageService.uploadFile(
                    audioFile,
                    FileType.AUDIO,
                    user.id,
                    'reflections',
                );
                audioUrl = uploadResult.url;

                // Transcribe audio
                transcriptionText = await this.transcriptionService.transcribeAudio(audioUrl);
                rawBeliefText = transcriptionText;
            } catch (error) {
                return this.HandleError(
                    new BadRequestException(`Failed to process audio file: ${error.message}`),
                );
            }
        } else if (dto.text) {
            // Use text input directly
            rawBeliefText = dto.text;
        } else {
            return this.HandleError(
                new BadRequestException('Either text or audio file must be provided'),
            );
        }

        // Update session with belief
        const updatedSession = await this.prisma.reflectionSession.update({
            where: { id: sessionId },
            data: {
                rawBeliefText,
                audioUrl,
                transcriptionText,
                status: 'BELIEF_CAPTURED',
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Add computed affirmationAudioUrl field
        const sessionWithAudio = {
            ...updatedSession,
            affirmationAudioUrl: this.getAffirmationAudioUrl(updatedSession),
        };

        return this.Results(sessionWithAudio);
    }

    /**
     * Generate affirmation from belief using NLP transformation
     */
    async generateAffirmation(firebaseId: string, sessionId: string) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        // Validate session ownership and status
        const session = await this.prisma.reflectionSession.findFirst({
            where: {
                id: sessionId,
                userId: user.id,
            },
        });

        if (!session) {
            return this.HandleError(new NotFoundException('Reflection session not found'));
        }

        // if (session.status !== 'BELIEF_CAPTURED') {
        //     return this.HandleError(
        //         new BadRequestException(
        //             `Cannot generate affirmation. Session must be in BELIEF_CAPTURED status. Current status: ${session.status}`,
        //         ),
        //     );
        // }

        if (!session.rawBeliefText || session.rawBeliefText.trim().length === 0) {
            return this.HandleError(
                new BadRequestException('Cannot generate affirmation. No belief text found in session.'),
            );
        }

        try {
            // Transform belief using NLP service
            const transformation = await this.nlpTransformationService.transformBelief(
                session.rawBeliefText,
            );

            // Generate TTS audio for affirmation
            let aiAffirmationAudioUrl: string | null = null;
            if (transformation.generatedAffirmation) {
                try {
                    aiAffirmationAudioUrl = await this.textToSpeechService.generateAffirmationAudio(
                        transformation.generatedAffirmation,
                        user.id,
                    );
                } catch (ttsError) {
                    this.logger.warn(`TTS generation failed: ${ttsError.message}. Continuing without audio.`);
                }
            }

            // Update session with transformation results
            const updatedSession = await this.prisma.reflectionSession.update({
                where: { id: sessionId },
                data: {
                    limitingBelief: transformation.limitingBelief,
                    generatedAffirmation: transformation.generatedAffirmation,
                    aiAffirmationAudioUrl,
                    status: 'AFFIRMATION_GENERATED',
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            // Add computed affirmationAudioUrl field
            const sessionWithAudio = {
                ...updatedSession,
                affirmationAudioUrl: this.getAffirmationAudioUrl(updatedSession),
            };

            return this.Results(sessionWithAudio);
        } catch (error) {
            // Log error but don't fail the request - transformation service handles fallbacks
            // If transformation fails, the service returns placeholder data
            // We still update the session to allow user to proceed
            this.logger.error(`Error generating affirmation: ${error.message}`, error.stack);

            // Try to update with whatever we got (even if it's placeholder)
            try {
                const transformation = await this.nlpTransformationService.transformBelief(
                    session.rawBeliefText,
                );

                const updatedSession = await this.prisma.reflectionSession.update({
                    where: { id: sessionId },
                    data: {
                        limitingBelief: transformation.limitingBelief,
                        generatedAffirmation: transformation.generatedAffirmation,
                        status: 'AFFIRMATION_GENERATED',
                    },
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                });

                // Add computed affirmationAudioUrl field
                const sessionWithAudio = {
                    ...updatedSession,
                    affirmationAudioUrl: this.getAffirmationAudioUrl(updatedSession),
                };

                return this.Results(sessionWithAudio);
            } catch (fallbackError) {
                return this.HandleError(
                    new BadRequestException(
                        `Failed to generate affirmation: ${fallbackError.message}`,
                    ),
                );
            }
        }
    }

    /**
     * Generate prompt based on category name
     */
    private generatePrompt(categoryName: string): string {
        // Check exact match first
        if (this.PROMPT_MAPPING[categoryName]) {
            return this.PROMPT_MAPPING[categoryName];
        }

        // Check partial matches (case-insensitive)
        const normalizedName = categoryName.toLowerCase();
        for (const [key, prompt] of Object.entries(this.PROMPT_MAPPING)) {
            if (normalizedName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedName)) {
                return prompt;
            }
        }

        // Default prompt if no match found
        return `${categoryName} is...`;
    }

    /**
     * Helper: Get user by Firebase ID
     */
    private async getUserByFirebaseId(firebaseId: string) {
        return this.prisma.user.findUnique({
            where: { firebaseId },
        });
    }

    /**
     * Re-record belief for a reflection session
     */
    async reRecordBelief(
        firebaseId: string,
        sessionId: string,
        dto: ReRecordBeliefDto,
        audioFile?: Express.Multer.File,
    ) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        // Validate session ownership
        const session = await this.prisma.reflectionSession.findFirst({
            where: {
                id: sessionId,
                userId: user.id,
            },
        });

        if (!session) {
            return this.HandleError(new NotFoundException('Reflection session not found'));
        }

        // Allow re-recording if status is BELIEF_CAPTURED or AFFIRMATION_GENERATED
        if (session.status !== 'BELIEF_CAPTURED' && session.status !== 'AFFIRMATION_GENERATED') {
            return this.HandleError(
                new BadRequestException(
                    `Cannot re-record belief. Session must be in BELIEF_CAPTURED or AFFIRMATION_GENERATED status. Current status: ${session.status}`,
                ),
            );
        }

        let rawBeliefText: string | undefined;
        let audioUrl: string | undefined;
        let transcriptionText: string | undefined;

        // Handle audio file upload and transcription
        if (audioFile) {
            try {
                // Upload audio file
                const uploadResult = await this.storageService.uploadFile(
                    audioFile,
                    FileType.AUDIO,
                    user.id,
                    'reflections',
                );
                audioUrl = uploadResult.url;

                // Transcribe audio
                transcriptionText = await this.transcriptionService.transcribeAudio(audioUrl);
                rawBeliefText = transcriptionText;
            } catch (error) {
                return this.HandleError(
                    new BadRequestException(`Failed to process audio file: ${error.message}`),
                );
            }
        } else if (dto.text) {
            // Use text input directly
            rawBeliefText = dto.text;
        } else {
            return this.HandleError(
                new BadRequestException('Either text or audio file must be provided'),
            );
        }

        // Determine new status - reset to BELIEF_CAPTURED if currently AFFIRMATION_GENERATED
        const newStatus = session.status === 'AFFIRMATION_GENERATED' ? 'BELIEF_CAPTURED' : session.status;

        // Update session with new belief
        const updatedSession = await this.prisma.reflectionSession.update({
            where: { id: sessionId },
            data: {
                rawBeliefText,
                audioUrl,
                transcriptionText,
                // Clear affirmation data if re-recording
                limitingBelief: newStatus === 'BELIEF_CAPTURED' ? null : session.limitingBelief,
                generatedAffirmation: newStatus === 'BELIEF_CAPTURED' ? null : session.generatedAffirmation,
                aiAffirmationAudioUrl: newStatus === 'BELIEF_CAPTURED' ? null : session.aiAffirmationAudioUrl,
                userAffirmationAudioUrl: newStatus === 'BELIEF_CAPTURED' ? null : session.userAffirmationAudioUrl,
                status: newStatus,
                beliefRerecordCount: session.beliefRerecordCount + 1,
                beliefRerecordedAt: new Date(),
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Add computed affirmationAudioUrl field
        const sessionWithAudio = {
            ...updatedSession,
            affirmationAudioUrl: this.getAffirmationAudioUrl(updatedSession),
        };

        return this.Results(sessionWithAudio);
    }

    /**
     * Record user's voice for affirmation
     */
    async recordUserAffirmation(
        firebaseId: string,
        sessionId: string,
        audioFile: Express.Multer.File,
    ) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        // Validate session ownership and status
        const session = await this.prisma.reflectionSession.findFirst({
            where: {
                id: sessionId,
                userId: user.id,
            },
        });

        if (!session) {
            return this.HandleError(new NotFoundException('Reflection session not found'));
        }

        if (session.status !== 'AFFIRMATION_GENERATED' && session.status !== 'APPROVED') {
            return this.HandleError(
                new BadRequestException(
                    `Cannot record affirmation. Session must be in AFFIRMATION_GENERATED or APPROVED status. Current status: ${session.status}`,
                ),
            );
        }

        try {
            // Upload audio file
            const uploadResult = await this.storageService.uploadFile(
                audioFile,
                FileType.AUDIO,
                user.id,
                'affirmations/user-recorded',
            );

            // Update session with user's audio recording
            const updatedSession = await this.prisma.reflectionSession.update({
                where: { id: sessionId },
                data: {
                    userAffirmationAudioUrl: uploadResult.url,
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            // Add computed affirmationAudioUrl field
            const sessionWithAudio = {
                ...updatedSession,
                affirmationAudioUrl: this.getAffirmationAudioUrl(updatedSession),
            };

            return this.Results(sessionWithAudio);
        } catch (error) {
            return this.HandleError(
                new BadRequestException(`Failed to upload audio file: ${error.message}`),
            );
        }
    }

    /**
     * Track playback of affirmation
     */
    async trackPlayback(firebaseId: string, sessionId: string) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        // Validate session ownership
        const session = await this.prisma.reflectionSession.findFirst({
            where: {
                id: sessionId,
                userId: user.id,
            },
        });

        if (!session) {
            return this.HandleError(new NotFoundException('Reflection session not found'));
        }

        // Update playback tracking
        const updatedSession = await this.prisma.reflectionSession.update({
            where: { id: sessionId },
            data: {
                playbackCount: session.playbackCount + 1,
                lastPlayedAt: new Date(),
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Add computed affirmationAudioUrl field
        const sessionWithAudio = {
            ...updatedSession,
            affirmationAudioUrl: this.getAffirmationAudioUrl(updatedSession),
        };

        return this.Results(sessionWithAudio);
    }

    async getAffirmations(firebaseId: string, page: number = 1, limit: number = 10) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.max(1, Math.min(100, Math.floor(limit)));
        const skip = (pageNumber - 1) * pageSize;

        const totalCount = await this.prisma.reflectionSession.count({
            where: { userId: user.id },
        });

        const affirmations = await this.prisma.reflectionSession.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
        });

        const totalPages = Math.ceil(totalCount / pageSize);

        return this.Results({
            data: affirmations,
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total: totalCount,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPreviousPage: pageNumber > 1,
            },
        });
    }

    /**
     * Get the appropriate audio URL for affirmation playback
     * Priority: userAffirmationAudioUrl > aiAffirmationAudioUrl
     */
    getAffirmationAudioUrl(session: any): string | null {
        if (session.userAffirmationAudioUrl) {
            return session.userAffirmationAudioUrl;
        }
        if (session.aiAffirmationAudioUrl) {
            return session.aiAffirmationAudioUrl;
        }
        return null;
    }

    /**
     * Helper: Validate category ownership
     */
    private async validateCategoryOwnership(userId: string, categoryId: string) {
        return this.prisma.wheelCategory.findFirst({
            where: {
                id: categoryId,
                wheel: { userId },
            },
        });
    }
}

