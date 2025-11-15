import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
// import { CreateUserDto, LoginUserDto, UpdateUserDto } from './dto';
import { User } from '@prisma/client';
import { DatabaseProvider } from 'src/database/database.provider';
import { BaseService, logger } from 'src/common';
import { ChangeNameDto } from './dto';
import { CloudStorageService } from 'src/common/storage';

@Injectable()
export class UserService extends BaseService {
  constructor(
    private prisma: DatabaseProvider,
    private cloudStorage: CloudStorageService,
  ) {
    super();
  }

  async findAll() { // add pagination
    const users = await this.prisma.user.findMany();
    return this.Results(users);
  }

  async getUserProfile(firebaseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseId }
    });

    if (!user) {
      return this.HandleError(
        new NotFoundException('User not found')
      )
    };

    return this.Results(user);
  }

  async changeName(id: string, payload: ChangeNameDto) {
    const { name } = payload;

    const user = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return this.HandleError(
        new NotFoundException('User not found')
      )
    };

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name,
      }
    })

    return this.Results(updatedUser);
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return this.HandleError(
        new NotFoundException('User not found')
      )
    };

    await this.prisma.user.delete({
      where: { id }
    });

    return this.Results(null);
  }

  async uploadAvatar(firebaseId: string, file: Express.Multer.File) {
    try {
      this.validateAvatarFile(file);

      const user = await this.prisma.user.findUnique({
        where: { firebaseId }
      });

      if (!user) {
        return this.HandleError(new NotFoundException('User not found'));
      }

      // Store old avatar URL for cleanup after successful update
      const oldAvatarUrl = user.avatar;

      // 3. Generate destination path with safe extension extraction
      const timestamp = Date.now();
      const fileExtension = this.getFileExtension(file.originalname);
      if (!fileExtension) {
        return this.HandleError(
          new BadRequestException('File must have a valid extension')
        );
      }
      const destination = `avatars/${user.id}-${timestamp}.${fileExtension}`;

      // 4. Upload new file to GCS FIRST
      const uploadResult = await this.cloudStorage.uploadFile(file, destination);

      if (uploadResult.isError) {
        return this.HandleError(uploadResult.error);
      }

      // 5. Update database (with rollback on failure)
      let updatedUser;
      try {
        updatedUser = await this.prisma.user.update({
          where: { firebaseId },
          data: {
            avatar: uploadResult.data.publicUrl,
          }
        });
      } catch (dbError) {
        // Rollback: Delete uploaded file if DB update fails
        await this.cloudStorage.deleteFile(destination);
        return this.HandleError(dbError as Error);
      }

      // 6. Delete old avatar asynchronously after successful update (fire-and-forget)
      if (oldAvatarUrl) {
        const oldFileName = this.extractFileNameFromUrl(oldAvatarUrl);
        if (oldFileName) {
          // Don't block response - log errors but don't fail
          this.cloudStorage.deleteFile(oldFileName).catch(err => {
            logger.error('Failed to delete old avatar:', err);
          });
        }
      }

      return this.Results({
        user: updatedUser,
        file: uploadResult.data,
      });
    } catch (error) {
      return this.HandleError(error as Error);
    }
  }

  async deleteAvatar(firebaseId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { firebaseId }
      });

      if (!user) {
        return this.HandleError(new NotFoundException('User not found'));
      }

      if (!user.avatar) {
        return this.HandleError(new NotFoundException('User has no avatar to delete'));
      }

      // Extract filename from avatar URL and delete from GCS
      const fileName = this.extractFileNameFromUrl(user.avatar);
      if (fileName) {
        const deleteResult = await this.cloudStorage.deleteFile(fileName);
        if (deleteResult.isError) {
          return this.HandleError(deleteResult.error);
        }
      }

      // Update user record to remove avatar
      const updatedUser = await this.prisma.user.update({
        where: { firebaseId },
        data: {
          avatar: null,
        }
      });

      return this.Results(updatedUser);
    } catch (error) {
      return this.HandleError(error as Error);
    }
  }

  /**
   * Validate avatar file (service-level validation for defense in depth)
   * @param file - The file to validate
   * @throws BadRequestException if validation fails
   */
  private validateAvatarFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Basic MIME type check (defense in depth - controller already validates)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPG, JPEG, PNG, and GIF are allowed.');
    }
  }

  /**
   * Safely extract file extension from filename
   * @param filename - The filename to extract extension from
   * @returns The file extension in lowercase, or null if invalid
   */
  private getFileExtension(filename: string): string | null {
    if (!filename || !filename.includes('.')) {
      return null;
    }

    const parts = filename.split('.');
    const extension = parts[parts.length - 1]?.toLowerCase();

    // Validate extension is reasonable (1-10 chars, alphanumeric)
    if (!extension || extension.length === 0 || extension.length > 10) {
      return null;
    }

    if (!/^[a-z0-9]+$/.test(extension)) {
      return null;
    }

    return extension;
  }

  /**
   * Extract filename from GCS public URL
   * Handles multiple URL formats:
   * - Standard: https://storage.googleapis.com/bucket-name/avatars/user-123.jpg
   * - Custom domain: https://cdn.example.com/avatars/user-123.jpg
   * - Direct bucket: https://storage.googleapis.com/bucket-name/o/avatars%2Fuser-123.jpg?...
   * 
   * @param url - The GCS public URL
   * @returns The file path in the bucket, or null if extraction fails
   */
  private extractFileNameFromUrl(url: string): string | null {
    if (!url) return null;

    try {
      // Handle standard GCS URL: googleapis.com/[bucket]/(path)
      let match = url.match(/googleapis\.com\/[^\/]+\/(.+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }

      // Handle custom domain URLs: /avatars/(path)
      match = url.match(/\/avatars\/(.+)/);
      if (match) {
        return `avatars/${decodeURIComponent(match[1])}`;
      }

      // Handle direct bucket URLs: /o/(path)?
      match = url.match(/\/o\/(.+?)(?:\?|$)/);
      if (match) {
        return decodeURIComponent(match[1].replace(/%2F/g, '/'));
      }

      return null;
    } catch {
      return null;
    }
  }
}
