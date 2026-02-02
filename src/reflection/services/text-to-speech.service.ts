import { Injectable, Logger } from '@nestjs/common';
import { config, BaseService } from 'src/common';
import { StorageService, FileType } from 'src/common/storage/storage.service';
import OpenAI from 'openai';
import { TtsVoicePreference } from '@prisma/client';

type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

interface PersonaConfig {
    openAiVoice: OpenAIVoice;
    gender: 'male' | 'female' | 'androgynous';
    name: string;
    displayName: string;
    description: string;
    personality: string[];
}

@Injectable()
export class TextToSpeechService extends BaseService {
    private readonly logger = new Logger(TextToSpeechService.name);
    private openai: OpenAI;

    private readonly PERSONA_MAPPING: Record<TtsVoicePreference, PersonaConfig> = {
        // Male Personas
        [TtsVoicePreference.MALE_CONFIDENT]: {
            openAiVoice: 'onyx',
            gender: 'male',
            name: 'Marcus',
            displayName: 'Marcus (Confident Coach)',
            description: 'Deep, authoritative voice that commands attention',
            personality: ['authoritative', 'grounding', 'powerful', 'commanding']
        },
        [TtsVoicePreference.MALE_FRIENDLY]: {
            openAiVoice: 'echo',
            gender: 'male',
            name: 'Daniel',
            displayName: 'Daniel (Friendly Guide)',
            description: 'Warm, conversational voice that feels approachable',
            personality: ['approachable', 'supportive', 'encouraging', 'relatable']
        },

        // Female Personas
        [TtsVoicePreference.FEMALE_EMPATHETIC]: {
            openAiVoice: 'nova',
            gender: 'female',
            name: 'Sophia',
            displayName: 'Sophia (Empathetic Mentor)',
            description: 'Nurturing, warm voice that radiates compassion',
            personality: ['nurturing', 'compassionate', 'understanding', 'gentle']
        },
        [TtsVoicePreference.FEMALE_ENERGETIC]: {
            openAiVoice: 'shimmer',
            gender: 'female',
            name: 'Maya',
            displayName: 'Maya (Energetic Motivator)',
            description: 'Upbeat, vibrant voice that inspires action',
            personality: ['upbeat', 'vibrant', 'motivating', 'enthusiastic']
        },

        // Androgynous Personas
        [TtsVoicePreference.ANDROGYNOUS_CALM]: {
            openAiVoice: 'alloy',
            gender: 'androgynous',
            name: 'Alex',
            displayName: 'Alex (Calm Companion)',
            description: 'Balanced, neutral voice that brings steadiness',
            personality: ['balanced', 'neutral', 'steady', 'peaceful']
        },
        [TtsVoicePreference.ANDROGYNOUS_WISE]: {
            openAiVoice: 'fable',
            gender: 'androgynous',
            name: 'River',
            displayName: 'River (Wise Advisor)',
            description: 'Thoughtful, mature voice that conveys wisdom',
            personality: ['thoughtful', 'mature', 'grounded', 'insightful']
        }
    };

    // Name to enum mapping for easy lookup
    private readonly NAME_TO_ENUM: Record<string, TtsVoicePreference> = {
        'Marcus': TtsVoicePreference.MALE_CONFIDENT,
        'Daniel': TtsVoicePreference.MALE_FRIENDLY,
        'Sophia': TtsVoicePreference.FEMALE_EMPATHETIC,
        'Maya': TtsVoicePreference.FEMALE_ENERGETIC,
        'Alex': TtsVoicePreference.ANDROGYNOUS_CALM,
        'River': TtsVoicePreference.ANDROGYNOUS_WISE,
    };

    constructor(private storageService: StorageService) {
        super();
        this.openai = new OpenAI({
            apiKey: config.OPENAI_API_KEY,
        });
        this.logger.log('OpenAI TTS client initialized');
    }

    /**
     * Convert persona name to TtsVoicePreference enum
     */
    convertNameToEnum(name: string): TtsVoicePreference | null {
        return this.NAME_TO_ENUM[name] || null;
    }

    /**
     * Convert TtsVoicePreference enum to persona name
     */
    convertEnumToName(preference: TtsVoicePreference): string | null {
        const config = this.PERSONA_MAPPING[preference];
        return config ? config.name : null;
    }

    /**
     * Map voice preference (enum or name) to OpenAI voice
     */
    private getVoiceFromPreference(preference?: string | null): OpenAIVoice {
        if (!preference) {
            // Fallback to config or default
            return (config.OPENAI_TTS_VOICE || 'alloy') as OpenAIVoice;
        }

        // Check if it's a name first
        const enumValue = this.NAME_TO_ENUM[preference];
        if (enumValue) {
            return this.PERSONA_MAPPING[enumValue].openAiVoice;
        }

        // Otherwise treat as enum value
        const personaConfig = this.PERSONA_MAPPING[preference as TtsVoicePreference];
        if (personaConfig) {
            return personaConfig.openAiVoice;
        }

        this.logger.warn(`Unknown voice preference: ${preference}, falling back to alloy`);
        return 'alloy';
    }

    /**
     * Get persona metadata for a given preference
     * Useful for API responses to show users their selected persona info
     */
    getPersonaMetadata(preference?: string | null): PersonaConfig | null {
        if (!preference) return null;
        return this.PERSONA_MAPPING[preference as TtsVoicePreference] || null;
    }

    /**
     * Get all available personas grouped by gender
     */
    getAllPersonas(): Record<string, Array<{ preference: TtsVoicePreference; config: PersonaConfig }>> {
        const grouped: Record<string, Array<{ preference: TtsVoicePreference; config: PersonaConfig }>> = {
            male: [],
            female: [],
            androgynous: []
        };

        for (const [preference, config] of Object.entries(this.PERSONA_MAPPING)) {
            grouped[config.gender].push({
                preference: preference as TtsVoicePreference,
                config
            });
        }

        return grouped;
    }

    /**
     * Generate audio from affirmation text using OpenAI TTS API
     * @param affirmationText - The affirmation text to convert to speech
     * @param userId - User ID for storage path
     * @param voicePreference - Optional voice persona preference (e.g., MALE_CONFIDENT, FEMALE_EMPATHETIC)
     * @returns Audio URL or null if generation fails
     */
    async generateAffirmationAudio(
        affirmationText: string,
        userId: string,
        voicePreference?: string | null,
    ): Promise<string | null> {
        if (!affirmationText || affirmationText.trim().length === 0) {
            this.logger.warn('Empty affirmation text provided for TTS');
            return null;
        }

        try {
            this.logger.log(`Generating TTS audio for affirmation (${affirmationText.length} chars)`);

            const model = config.OPENAI_TTS_MODEL || 'tts-1';
            const voice = this.getVoiceFromPreference(voicePreference);

            // Generate speech using OpenAI TTS API
            const response = await this.openai.audio.speech.create({
                model: model,
                voice: voice,
                input: affirmationText,
                response_format: 'mp3',
            });

            // Convert response to buffer
            const audioBuffer = Buffer.from(await response.arrayBuffer());

            // Create a temporary file-like object for upload
            const audioFile: Express.Multer.File = {
                fieldname: 'audio',
                originalname: 'affirmation.mp3',
                encoding: '7bit',
                mimetype: 'audio/mpeg',
                buffer: audioBuffer,
                size: audioBuffer.length,
                destination: '',
                filename: '',
                path: '',
                stream: null as any,
            };

            // Upload to storage
            const uploadResult = await this.storageService.uploadFile(
                audioFile,
                FileType.AUDIO,
                userId,
                'affirmations/ai-generated',
            );

            this.logger.log(`TTS audio generated and uploaded: ${uploadResult.url}`);
            return uploadResult.url;
        } catch (error) {
            this.logger.error(`Error generating TTS audio: ${error.message}`, error.stack);
            // Return null on error - session will work without audio
            return null;
        }
    }
}
