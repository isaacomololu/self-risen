import { Injectable, Logger } from '@nestjs/common';
import { config, BaseService } from 'src/common';
import { StorageService, FileType } from 'src/common/storage/storage.service';
import OpenAI from 'openai';

@Injectable()
export class TextToSpeechService extends BaseService {
    private readonly logger = new Logger(TextToSpeechService.name);
    private openai: OpenAI;

    constructor(private storageService: StorageService) {
        super();
        this.openai = new OpenAI({
            apiKey: config.OPENAI_API_KEY,
        });
        this.logger.log('OpenAI TTS client initialized');
    }

    /**
     * Generate audio from affirmation text using OpenAI TTS API
     * @param affirmationText - The affirmation text to convert to speech
     * @param userId - User ID for storage path
     * @returns Audio URL or null if generation fails
     */
    async generateAffirmationAudio(
        affirmationText: string,
        userId: string,
    ): Promise<string | null> {
        if (!affirmationText || affirmationText.trim().length === 0) {
            this.logger.warn('Empty affirmation text provided for TTS');
            return null;
        }

        try {
            this.logger.log(`Generating TTS audio for affirmation (${affirmationText.length} chars)`);

            const model = config.OPENAI_TTS_MODEL || 'tts-1';
            const voice = (config.OPENAI_TTS_VOICE || 'alloy') as
                | 'alloy'
                | 'echo'
                | 'fable'
                | 'onyx'
                | 'nova'
                | 'shimmer';

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
