import { Injectable, Logger } from '@nestjs/common';
import { config, BaseService } from 'src/common';
import OpenAI from 'openai';

@Injectable()
export class TranscriptionService extends BaseService {
    private readonly logger = new Logger(TranscriptionService.name);
    private openai: OpenAI | null = null;

    constructor() {
        super();
        if (config.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: config.OPENAI_API_KEY,
            });
            this.logger.log('OpenAI client initialized');
        } else {
            this.logger.warn('OPENAI_API_KEY not configured. Transcription will return placeholder text.');
        }
    }

    /**
     * Transcribe audio file from URL using OpenAI Whisper API
     * @param audioUrl - URL of the audio file to transcribe
     * @returns Transcribed text
     */
    async transcribeAudio(audioUrl: string): Promise<string> {
        if (!this.openai) {
            this.logger.warn('OpenAI not configured. Returning placeholder transcription.');
            return '[Transcription unavailable - OpenAI API key not configured]';
        }

        try {
            this.logger.log(`Starting transcription for audio: ${audioUrl}`);

            // Fetch the audio file from the URL
            const response = await fetch(audioUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch audio file: ${response.statusText}`);
            }

            const audioBuffer = Buffer.from(await response.arrayBuffer());

            // Create a File object for OpenAI API
            // In Node.js 18+, File is available globally
            // Create File with proper MIME type detection
            const contentType = response.headers.get('content-type') || 'audio/mpeg';
            const fileName = audioUrl.split('/').pop() || 'audio.mp3';

            // Create File object (available in Node.js 18+)
            const audioFile = new File([audioBuffer], fileName, { type: contentType });

            // Use OpenAI Whisper API for transcription
            const model = config.OPENAI_MODEL || 'whisper-1';
            const transcription = await this.openai.audio.transcriptions.create({
                file: audioFile,
                model: model,
                language: 'en', // Optional: specify language for better accuracy
            });

            const transcribedText = transcription.text;
            this.logger.log(`Transcription completed. Length: ${transcribedText.length} characters`);

            return transcribedText;
        } catch (error) {
            this.logger.error(`Error transcribing audio: ${error.message}`, error.stack);
            throw new Error(`Failed to transcribe audio: ${error.message}`);
        }
    }
}

