import { ConflictException, Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
// import { CreateUserDto, LoginUserDto, UpdateUserDto } from './dto';
import { User } from '@prisma/client';
import { DatabaseProvider } from 'src/database/database.provider';
import { BaseService, FileType, StorageService } from 'src/common';
import { ChangeNameDto, ChangeUsernameDto, ChangeTtsVoicePreferenceDto } from './dto';
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

    return this.Results(updatedUser);
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
      return this.Results(updatedUser);
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
      'Marcus': 'MALE_CONFIDENT',
      'Daniel': 'MALE_FRIENDLY',
      'Sophia': 'FEMALE_EMPATHETIC',
      'Maya': 'FEMALE_ENERGETIC',
      'Alex': 'ANDROGYNOUS_CALM',
      'River': 'ANDROGYNOUS_WISE',
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

    return this.Results(updatedUser);
  }

  async getAvailablePersonas() {
    const allPersonas = this.textToSpeechService.getAllPersonas();
    
    // Transform the data to be more frontend-friendly
    const formattedPersonas = {
      male: allPersonas.male.map(p => ({
        name: p.config.name,
        displayName: p.config.displayName,
        gender: p.config.gender,
        description: p.config.description,
        personality: p.config.personality
      })),
      female: allPersonas.female.map(p => ({
        name: p.config.name,
        displayName: p.config.displayName,
        gender: p.config.gender,
        description: p.config.description,
        personality: p.config.personality
      })),
      androgynous: allPersonas.androgynous.map(p => ({
        name: p.config.name,
        displayName: p.config.displayName,
        gender: p.config.gender,
        description: p.config.description,
        personality: p.config.personality
      }))
    };

    return this.Results(formattedPersonas);
  }
}