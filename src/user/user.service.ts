import { ConflictException, Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
// import { CreateUserDto, LoginUserDto, UpdateUserDto } from './dto';
import { User } from '@prisma/client';
import { DatabaseProvider } from 'src/database/database.provider';
import { BaseService, FileType, StorageService } from 'src/common';
import { ChangeNameDto, ChangeUsernameDto, ChangeTtsVoicePreferenceDto, UpdateStreakReminderPreferencesDto } from './dto';
import { TextToSpeechService } from 'src/reflection/services/text-to-speech.service';
import { UploadAvatarDto } from './dto/upload-avatar.dto';
import { config } from 'src/common';
@Injectable()
export class UserService extends BaseService {
  constructor(
    private prisma: DatabaseProvider,
    private storageService: StorageService,
    private textToSpeechService: TextToSpeechService
  ) {
    super();
  }

  /**
   * Enrich user object with TTS voice persona details
   */
  private enrichUserWithPersonaDetails(user: any) {
    if (!user) return user;

    const personaDetails = user.ttsVoicePreference 
      ? this.textToSpeechService.getPersonaMetadata(user.ttsVoicePreference)
      : null;

    return {
      ...user,
      ttsVoicePersona: personaDetails ? {
        name: personaDetails.name,
        displayName: personaDetails.displayName,
        description: personaDetails.description,
        personality: personaDetails.personality
      } : null
    };
  }

  async findAll() { // add pagination
    const users = await this.prisma.user.findMany();
    const enrichedUsers = users.map(user => this.enrichUserWithPersonaDetails(user));
    return this.Results(enrichedUsers);
  }

  async getUserProfile(firebaseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseId },
      include: {
        _count: {
          select: {
            reflectionSessions: true,
          }
        }
      }
    });

    if (!user) {
      return this.HandleError(
        new NotFoundException('User not found')
      )
    };

    const enrichedUser = this.enrichUserWithPersonaDetails(user);
    
    // Add token usage summary
    const now = new Date();
    const resetDate = new Date(user.tokenResetDate);
    const daysUntilReset = Math.max(0, Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    return this.Results({
      ...enrichedUser,
      tokenUsage: {
        tokensUsedThisMonth: user.tokensUsedThisMonth,
        tokenLimitPerMonth: user.tokenLimitPerMonth,
        tokensRemaining: Math.max(0, user.tokenLimitPerMonth - user.tokensUsedThisMonth),
        usagePercentage: Math.round((user.tokensUsedThisMonth / user.tokenLimitPerMonth) * 10000) / 100,
        resetDate: user.tokenResetDate,
        daysUntilReset,
      }
    });
  }

  async changeName(firebaseId: string, payload: ChangeNameDto) {
    const { name } = payload;

    const user = await this.prisma.user.findUnique({
      where: { firebaseId }
    });

    if (!user) {
      return this.HandleError(
        new NotFoundException('User not found')
      )
    };

    const updatedUser = await this.prisma.user.update({
      where: { firebaseId },
      data: {
        name,
      }
    })

    const enrichedUser = this.enrichUserWithPersonaDetails(updatedUser);
    return this.Results(enrichedUser);
  }

  async changeUsername(firebaseId: string, payload: ChangeUsernameDto) {
    const { username } = payload;

    const user = await this.prisma.user.findUnique({
      where: { firebaseId }
    });

    if (!user) {
      return this.HandleError(
        new NotFoundException('User not found')
      )
    };

    const updatedUser = await this.prisma.user.update({
      where: { firebaseId },
      data: {
        username,
      }
    })

    return this.Results(updatedUser);
  }

  async deleteUser(firebaseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseId }
    });

    if (!user) {
      return this.HandleError(
        new NotFoundException('User not found')
      )
    };

    await this.prisma.user.delete({
      where: { firebaseId }
    });

    return this.Results(null);
  }

  async uploadAvatar(
    firebaseId: string,
    file: Express.Multer.File
  ) {
    console.log(`[UserService.uploadAvatar] Starting avatar upload for firebaseId: ${firebaseId}`);

    const user = await this.prisma.user.findUnique({
      where: { firebaseId }
    });

    if (!user) {
      console.error(`[UserService.uploadAvatar] User not found for firebaseId: ${firebaseId}`);
      return this.HandleError(
        new NotFoundException('User not found')
      )
    };

    console.log(`[UserService.uploadAvatar] User found: ${user.id}, calling storageService.uploadFile...`);

    try {
      const upload = await this.storageService.uploadFile(
        file,
        FileType.IMAGE,
        user.id,
        'avatars'
      );
      console.log(`[UserService.uploadAvatar] Upload successful, URL: ${upload.url}`);

      // if (user.avatar) {
      //   await this.storageService.deleteFile(user.avatar);
      // }

      const avatar = upload.url;

      const updatedUser = await this.prisma.user.update({
        where: { firebaseId },
        data: {
          avatar,
        }
      });

      console.log(`[UserService.uploadAvatar] User avatar updated successfully`);
      const enrichedUser = this.enrichUserWithPersonaDetails(updatedUser);
      return this.Results(enrichedUser);
    } catch (error) {
      console.error(`[UserService.uploadAvatar] Error during upload:`, {
        error: error.message,
        stack: error.stack,
        code: error.code,
      });
      throw error;
    }
  }

  async getStats(firebaseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseId },
      select: {
        streak: true,
        sessions: true,
      }
    });

    if (!user) {
      return this.HandleError(
        new NotFoundException('User not found')
      )
    };

    return this.Results(user);
  }

  async changeTtsVoicePreference(firebaseId: string, payload: ChangeTtsVoicePreferenceDto) {
    const { ttsVoicePreference } = payload;

    const user = await this.prisma.user.findUnique({
      where: { firebaseId }
    });

    if (!user) {
      return this.HandleError(
        new NotFoundException('User not found')
      )
    };

    // Convert persona name to enum value
    const nameToEnumMap: Record<string, string> = {
      'Sage': 'FEMALE_EMPATHETIC',
      'Phoenix': 'FEMALE_ENERGETIC',
      'River': 'MALE_CONFIDENT',
      'Quinn': 'MALE_FRIENDLY',
      'Alex': 'ANDROGYNOUS_CALM',
      'Robin': 'ANDROGYNOUS_WISE',
    };

    const enumValue = nameToEnumMap[ttsVoicePreference];
    if (!enumValue) {
      return this.HandleError(
        new BadRequestException(`Invalid persona name: ${ttsVoicePreference}`)
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { firebaseId },
      data: {
        ttsVoicePreference: enumValue as any,
      }
    })

    const enrichedUser = this.enrichUserWithPersonaDetails(updatedUser);
    return this.Results(enrichedUser);
  }

  async getAvailablePersonas() {
    const allPersonas = this.textToSpeechService.getAllPersonas();
    // Flat list; gender not exposed in API (personas shown without gender labels)
    const personas = [
      ...allPersonas.female,
      ...allPersonas.male,
      ...allPersonas.androgynous,
    ].map(p => ({
      name: p.config.name,
      displayName: p.config.displayName,
      description: p.config.description,
      personality: p.config.personality,
      preference: p.preference,
    }));

    return this.Results({ personas });
  }

  async getStreakReminderPreferences(firebaseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseId },
      select: {
        streakReminderEnabled: true,
        streakReminderTimes: true,
        timezone: true,
      },
    });

    if (!user) {
      return this.HandleError(new NotFoundException('User not found'));
    }

    return this.Results({
      enabled: user.streakReminderEnabled,
      times: user.streakReminderTimes ?? [],
      timezone: user.timezone ?? 'UTC',
    });
  }

  async updateStreakReminderPreferences(firebaseId: string, payload: UpdateStreakReminderPreferencesDto) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseId },
    });

    if (!user) {
      return this.HandleError(new NotFoundException('User not found'));
    }

    const data: { streakReminderEnabled?: boolean; streakReminderTimes?: string[]; timezone?: string } = {};
    if (payload.enabled !== undefined) data.streakReminderEnabled = payload.enabled;
    if (payload.times !== undefined) data.streakReminderTimes = payload.times;
    if (payload.timezone !== undefined) data.timezone = payload.timezone;

    const updated = await this.prisma.user.update({
      where: { firebaseId },
      data,
      select: {
        streakReminderEnabled: true,
        streakReminderTimes: true,
        timezone: true,
      },
    });

    return this.Results({
      enabled: updated.streakReminderEnabled,
      times: updated.streakReminderTimes ?? [],
      timezone: updated.timezone ?? 'UTC',
    });
  }
}