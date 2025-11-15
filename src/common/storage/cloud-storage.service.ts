import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { BaseService } from '../base.service';
import { ServiceResponse } from '../interfaces';
import { config } from '../config';
import { logger } from '..';

export interface UploadedFileMetadata {
  fileName: string;
  publicUrl: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

@Injectable()
export class CloudStorageService extends BaseService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    super();
    this.initializeStorage();
  }

  private initializeStorage(): void {
    try {
      // Parse credentials from environment variable (JSON string)
      const credentials = JSON.parse(config.GOOGLE_CLOUD_CREDENTIALS);

      this.storage = new Storage({
        projectId: config.GOOGLE_CLOUD_PROJECT_ID,
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
      });

      this.bucketName = config.GOOGLE_CLOUD_STORAGE_BUCKET;

      logger.log('Google Cloud Storage initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Cloud Storage:', error);
      throw new Error('Google Cloud Storage initialization failed');
    }
  }

  /**
   * Upload a file to Google Cloud Storage
   * @param file - The file buffer and metadata from multer
   * @param destination - The destination path/filename in the bucket
   * @returns ServiceResponse with uploaded file metadata
   */
  async uploadFile(
    file: Express.Multer.File,
    destination: string,
  ): Promise<ServiceResponse<UploadedFileMetadata>> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const blob = bucket.file(destination);

      // Create a write stream to upload the file
      const blobStream = blob.createWriteStream({
        resumable: false,
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      return new Promise((resolve) => {
        blobStream.on('error', (error) => {
          logger.error('Error uploading file to GCS:', error);
          resolve(this.HandleError(error));
        });

        blobStream.on('finish', async () => {
          try {
            // Make the file public
            await blob.makePublic();

            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${destination}`;

            const metadata: UploadedFileMetadata = {
              fileName: destination,
              publicUrl,
              size: file.size,
              mimeType: file.mimetype,
              uploadedAt: new Date(),
            };

            logger.log(`File uploaded successfully: ${destination}`);
            resolve(this.Results(metadata));
          } catch (error) {
            logger.error('Error making file public:', error);
            resolve(this.HandleError(error as Error));
          }
        });

        // Write the file buffer to GCS
        blobStream.end(file.buffer);
      });
    } catch (error) {
      logger.error('Error in uploadFile:', error);
      return this.HandleError(error as Error);
    }
  }

  /**
   * Delete a file from Google Cloud Storage
   * @param fileName - The name/path of the file to delete
   * @returns ServiceResponse indicating success or failure
   */
  async deleteFile(fileName: string): Promise<ServiceResponse<boolean>> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        logger.warn(`File not found in GCS: ${fileName}`);
        return this.Results(true); // Consider it deleted if it doesn't exist
      }

      await file.delete();
      logger.log(`File deleted successfully: ${fileName}`);
      return this.Results(true);
    } catch (error) {
      logger.error('Error deleting file from GCS:', error);
      return this.HandleError(error as Error);
    }
  }

  /**
   * Generate a signed URL for temporary access to a private file
   * @param fileName - The name/path of the file
   * @param expirationMinutes - How long the URL should be valid (default: 15 minutes)
   * @returns ServiceResponse with signed URL
   */
  async getSignedUrl(
    fileName: string,
    expirationMinutes: number = 15,
  ): Promise<ServiceResponse<string>> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expirationMinutes * 60 * 1000,
      });

      return this.Results(url);
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      return this.HandleError(error as Error);
    }
  }

  /**
   * Get the public URL for a file (assumes file is public)
   * @param fileName - The name/path of the file
   * @returns Public URL string
   */
  getPublicUrl(fileName: string): string {
    return `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
  }
}
