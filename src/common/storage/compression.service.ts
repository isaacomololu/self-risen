import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import { config } from '../config';

export interface CompressionResult {
  buffer: Buffer;
  mimetype: string;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
}

@Injectable()
export class CompressionService {
  private readonly logger = new Logger(CompressionService.name);

  private readonly QUALITY_SMALL: number;
  private readonly QUALITY_MEDIUM: number;
  private readonly QUALITY_LARGE: number;
  private readonly ENABLE_IMAGE_COMPRESSION: boolean;
  private readonly ENABLE_VIDEO_COMPRESSION: boolean;

  constructor() {
    this.QUALITY_SMALL = config.COMPRESSION_QUALITY_SMALL ?? 85; // < 100KB
    this.QUALITY_MEDIUM = config.COMPRESSION_QUALITY_MEDIUM ?? 75; // 100KB - 1MB
    this.QUALITY_LARGE = config.COMPRESSION_QUALITY_LARGE ?? 65; // > 1MB
    this.ENABLE_IMAGE_COMPRESSION =
      config.ENABLE_IMAGE_COMPRESSION !== 'false'; // Default to true
    this.ENABLE_VIDEO_COMPRESSION =
      config.ENABLE_VIDEO_COMPRESSION !== 'false'; // Default to true
  }

  // Max dimensions for images (optional resize)
  private readonly MAX_IMAGE_WIDTH = 1920;
  private readonly MAX_IMAGE_HEIGHT = 1920;

  // Minimum file size to compress (skip very small files)
  private readonly MIN_COMPRESS_SIZE = 10 * 1024; // 10KB

  /**
   * Compress an image using Sharp
   * Converts to WebP format with adaptive quality
   */
  async compressImage(
    file: Express.Multer.File,
    options?: { skipIfSmall?: boolean },
  ): Promise<CompressionResult | null> {
    // Check if image compression is enabled
    if (!this.ENABLE_IMAGE_COMPRESSION) {
      this.logger.debug('Image compression is disabled');
      return null;
    }

    const originalSize = file.size;
    const mimetype = file.mimetype || '';

    // Skip SVG files (vector format, compression not beneficial)
    if (mimetype === 'image/svg+xml') {
      this.logger.debug('Skipping compression for SVG file');
      return null;
    }

    // Skip very small files if option is set
    if (options?.skipIfSmall && originalSize < this.MIN_COMPRESS_SIZE) {
      this.logger.debug(`Skipping compression for small file (${originalSize} bytes)`);
      return null;
    }

    try {
      // Determine quality based on file size
      let quality: number;
      if (originalSize < 100 * 1024) {
        quality = this.QUALITY_SMALL;
      } else if (originalSize < 1024 * 1024) {
        quality = this.QUALITY_MEDIUM;
      } else {
        quality = this.QUALITY_LARGE;
      }

      this.logger.debug(
        `Compressing image: ${file.originalname}, Original size: ${(originalSize / 1024).toFixed(2)}KB, Quality: ${quality}%`,
      );

      // Compress image using Sharp
      const compressedBuffer = await sharp(file.buffer)
        .resize(this.MAX_IMAGE_WIDTH, this.MAX_IMAGE_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();

      const compressedSize = compressedBuffer.length;
      const reductionPercentage =
        ((originalSize - compressedSize) / originalSize) * 100;

      this.logger.log(
        `Image compressed: ${file.originalname} - ${(originalSize / 1024).toFixed(2)}KB → ${(compressedSize / 1024).toFixed(2)}KB (${reductionPercentage.toFixed(1)}% reduction)`,
      );

      return {
        buffer: compressedBuffer,
        mimetype: 'image/webp',
        originalSize,
        compressedSize,
        reductionPercentage,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to compress image ${file.originalname}: ${error.message}. Using original file.`,
      );
      return null; // Return null to indicate compression failed, use original
    }
  }

  /**
   * Compress a video using ffmpeg
   * Converts to MP4 (H.264 codec) with adaptive bitrate
   */
  async compressVideo(
    file: Express.Multer.File,
    options?: { skipIfSmall?: boolean },
  ): Promise<CompressionResult | null> {
    // Check if video compression is enabled
    if (!this.ENABLE_VIDEO_COMPRESSION) {
      this.logger.debug('Video compression is disabled');
      return null;
    }

    const originalSize = file.size;

    // Skip very small files if option is set
    if (options?.skipIfSmall && originalSize < this.MIN_COMPRESS_SIZE * 10) {
      this.logger.debug(`Skipping compression for small video file (${originalSize} bytes)`);
      return null;
    }

    // Check if ffmpeg is available
    try {
      await this.checkFfmpegAvailable();
    } catch (error) {
      this.logger.warn(
        `ffmpeg not available: ${error.message}. Skipping video compression.`,
      );
      return null;
    }

    try {
      // Determine bitrate based on file size
      // Larger files get lower bitrate for more compression
      let targetBitrate: string;
      if (originalSize < 5 * 1024 * 1024) {
        // < 5MB: 1M bitrate
        targetBitrate = '1M';
      } else if (originalSize < 50 * 1024 * 1024) {
        // 5MB - 50MB: 2M bitrate
        targetBitrate = '2M';
      } else {
        // > 50MB: 3M bitrate
        targetBitrate = '3M';
      }

      this.logger.debug(
        `Compressing video: ${file.originalname}, Original size: ${(originalSize / (1024 * 1024)).toFixed(2)}MB, Target bitrate: ${targetBitrate}`,
      );

      // Compress video using ffmpeg
      const compressedBuffer = await this.compressVideoWithFfmpeg(
        file.buffer,
        targetBitrate,
      );

      const compressedSize = compressedBuffer.length;
      const reductionPercentage =
        ((originalSize - compressedSize) / originalSize) * 100;

      this.logger.log(
        `Video compressed: ${file.originalname} - ${(originalSize / (1024 * 1024)).toFixed(2)}MB → ${(compressedSize / (1024 * 1024)).toFixed(2)}MB (${reductionPercentage.toFixed(1)}% reduction)`,
      );

      return {
        buffer: compressedBuffer,
        mimetype: 'video/mp4',
        originalSize,
        compressedSize,
        reductionPercentage,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to compress video ${file.originalname}: ${error.message}. Using original file.`,
      );
      return null; // Return null to indicate compression failed, use original
    }
  }

  /**
   * Check if ffmpeg is available on the system
   */
  private async checkFfmpegAvailable(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use ffmpeg.getAvailableEncoders to check if ffmpeg is available
      // This is a lightweight check that doesn't require a file
      ffmpeg.getAvailableEncoders((err, encoders) => {
        if (err) {
          // If we can't get encoders, ffmpeg is likely not installed
          reject(new Error('ffmpeg binary not found or not accessible'));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Compress video buffer using ffmpeg
   */
  private async compressVideoWithFfmpeg(
    inputBuffer: Buffer,
    targetBitrate: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let hasError = false;

      // Create readable stream from buffer
      const inputStream = Readable.from(inputBuffer);

      const command = ffmpeg(inputStream)
        .inputFormat('mp4') // Try to auto-detect, but specify if known
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset fast',
          `-b:v ${targetBitrate}`,
          '-movflags +faststart', // Optimize for web streaming
          '-crf 23', // Constant rate factor for quality
          '-f mp4', // Force MP4 format
        ])
        .format('mp4')
        .on('error', (err) => {
          if (!hasError) {
            hasError = true;
            reject(new Error(`ffmpeg error: ${err.message}`));
          }
        })
        .on('end', () => {
          if (!hasError) {
            const compressedBuffer = Buffer.concat(chunks);
            resolve(compressedBuffer);
          }
        });

      // Pipe output to collect compressed data
      const outputStream = command.pipe();
      outputStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      outputStream.on('error', (err) => {
        if (!hasError) {
          hasError = true;
          reject(new Error(`Stream error: ${err.message}`));
        }
      });
      outputStream.on('end', () => {
        // This might fire before the 'end' event on command
        // The command 'end' event will resolve the promise
      });
    });
  }
}
