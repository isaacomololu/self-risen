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
     * Transcribe audio file from URL or file buffer using OpenAI Whisper API
     * @param audioInput - URL string of the audio file or Express.Multer.File to transcribe
     * @returns Transcribed text
     */
    async transcribeAudio(audioInput: string | Express.Multer.File): Promise<string> {
        if (!this.openai) {
            this.logger.warn('OpenAI not configured. Returning placeholder transcription.');
            return '[Transcription unavailable - OpenAI API key not configured]';
        }

        try {
            let audioBuffer: Buffer;
            let contentType: string;
            let fileExtension: string;

            // Handle both URL string and file buffer inputs
            if (typeof audioInput === 'string') {
                // Legacy support: fetch from URL
                this.logger.log(`Starting transcription for audio URL: ${audioInput}`);
                const response = await fetch(audioInput);
                if (!response.ok) {
                    throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
                }

                audioBuffer = Buffer.from(await response.arrayBuffer());
                contentType = response.headers.get('content-type') || 'audio/mpeg';
                
                // Determine file extension from content type or URL
                fileExtension = 'mp3';
                if (contentType.includes('wav')) fileExtension = 'wav';
                else if (contentType.includes('ogg')) fileExtension = 'ogg';
                else if (contentType.includes('m4a')) fileExtension = 'm4a';
                else if (contentType.includes('webm')) fileExtension = 'webm';
            } else {
                // Direct file buffer input
                this.logger.log(`Starting transcription for audio file: ${audioInput.originalname || 'audio'}`);
                audioBuffer = audioInput.buffer;
                contentType = audioInput.mimetype || 'audio/mpeg';
                
                // Determine file extension from mimetype or originalname
                fileExtension = 'mp3';
                if (contentType.includes('wav')) fileExtension = 'wav';
                else if (contentType.includes('ogg')) fileExtension = 'ogg';
                else if (contentType.includes('m4a')) fileExtension = 'm4a';
                else if (contentType.includes('webm')) fileExtension = 'webm';
                else if (audioInput.originalname) {
                    const ext = audioInput.originalname.split('.').pop()?.toLowerCase();
                    if (ext && ['wav', 'ogg', 'm4a', 'webm', 'mp3'].includes(ext)) {
                        fileExtension = ext;
                    }
                }
            }
            
            this.logger.debug(`Processing audio file, Size: ${audioBuffer.length} bytes, Type: ${contentType}`);

            // Use OpenAI Whisper API for transcription
            const model = config.OPENAI_MODEL || 'whisper-1';
            this.logger.debug(`Transcribing with model: ${model}`);
            
            // Use OpenAI's toFile utility to create a proper file object from buffer
            // This ensures compatibility with OpenAI SDK v6
            const { toFile } = await import('openai');
            const fileName = `audio.${fileExtension}`;
            const audioFile = await toFile(audioBuffer, fileName, {
                type: contentType,
            });

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
            
            // Provide more detailed error information
            if (error.message.includes('404')) {
                throw new Error(`Failed to transcribe audio: The audio file URL is not accessible. This may be due to an expired signed URL or network issue. Original error: ${error.message}`);
            }
            
            throw new Error(`Failed to transcribe audio: ${error.message}`);
        }
    }
}

