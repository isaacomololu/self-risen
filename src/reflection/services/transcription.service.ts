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
                
                // Validate buffer exists and is not empty
                if (!audioInput.buffer || audioInput.buffer.length === 0) {
                    throw new Error('Audio file buffer is empty or invalid');
                }
                
                // Ensure buffer is a proper Buffer instance
                audioBuffer = Buffer.isBuffer(audioInput.buffer) 
                    ? audioInput.buffer 
                    : Buffer.from(audioInput.buffer);
                
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

            // Validate buffer size (OpenAI has limits)
            if (audioBuffer.length === 0) {
                throw new Error('Audio buffer is empty');
            }
            if (audioBuffer.length > 25 * 1024 * 1024) { // 25MB limit for Whisper API
                throw new Error(`Audio file too large: ${audioBuffer.length} bytes (max 25MB)`);
            }

            // Use OpenAI Whisper API for transcription
            const model = config.OPENAI_TRANSCRIPTION_MODEL;
            this.logger.debug(`Transcribing with model: ${model}`);
            
            // Use OpenAI's toFile utility to create a proper file object from buffer
            // This ensures compatibility with OpenAI SDK v6
            const { toFile } = await import('openai');
            const fileName = `audio.${fileExtension}`;
            
            // Convert Buffer to Uint8Array for better compatibility with toFile
            // toFile can accept Buffer, but converting to Uint8Array ensures compatibility
            const uint8Array = new Uint8Array(audioBuffer);
            
            // Create File object from buffer
            const audioFile = await toFile(uint8Array, fileName, {
                type: contentType,
            });

            this.logger.debug(`Created file object: ${fileName}, size: ${audioBuffer.length} bytes, type: ${contentType}`);

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
            if (error.message?.includes('404') || error.message?.includes('Invalid URL')) {
                // This could be a file format issue or API endpoint issue
                const errorDetails = error.response?.data || error.message;
                throw new Error(`Failed to transcribe audio: Invalid file format or API error. Please ensure the audio file is in a supported format (mp3, wav, m4a, webm, ogg). Original error: ${errorDetails}`);
            }
            
            // Check for file size or format errors
            if (error.message?.includes('file_size_exceeded') || error.message?.includes('too large')) {
                throw new Error(`Failed to transcribe audio: File is too large. Maximum size is 25MB. Original error: ${error.message}`);
            }
            
            throw new Error(`Failed to transcribe audio: ${error.message || 'Unknown error occurred'}`);
        }
    }
}

