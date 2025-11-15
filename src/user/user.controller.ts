import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { BaseController } from 'src/common';
import { AuthGuard, FirebaseUser } from 'src/common/';
import { ApiBearerAuth } from '@nestjs/swagger';
import { auth } from 'firebase-admin';
import { FirebaseGuard } from '@alpha018/nestjs-firebase-auth';
import { ChangeNameDto } from './dto';

@UseGuards(FirebaseGuard)
@ApiBearerAuth('firebase')
@Controller('user')
export class UserController extends BaseController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Get()
  async findAll() {
    const users = await this.userService.findAll();

    if (users.isError) throw users.error;

    return this.response({
      message: 'Users Retrived',
      data: users.data
    });
  }

  @Get('one')
  // @UseGuards(AuthGuard)
  // @ApiBearerAuth('firebase')
  async getUserProfile(@FirebaseUser() user: auth.DecodedIdToken) {
    const userProfile = await this.userService.getUserProfile(user.uid);

    if (userProfile.isError) throw userProfile.error;

    return this.response({
      message: 'Account Retrived',
      data: userProfile.data,
    })
  }

  @Patch(':id')
  async changeName(@Param('id') id: string, @Body() form: ChangeNameDto) {
    const user = await this.userService.changeName(id, form);

    if (user.isError) throw user.error;

    return this.response({
      message: 'Names Updated',
      data: user.data,
    })
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB max file size
      },
      fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              'Invalid file type. Only JPG, JPEG, PNG, and GIF are allowed.'
            ),
            false
          );
        }
      },
    })
  )
  async uploadAvatar(
    @FirebaseUser() user: auth.DecodedIdToken,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.userService.uploadAvatar(user.uid, file);

    if (result.isError) throw result.error;

    return this.response({
      message: 'Avatar uploaded successfully',
      data: result.data,
    });
  }

  @Delete('avatar')
  async deleteAvatar(@FirebaseUser() user: auth.DecodedIdToken) {
    const result = await this.userService.deleteAvatar(user.uid);

    if (result.isError) throw result.error;

    return this.response({
      message: 'Avatar deleted successfully',
      data: result.data,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const user = await this.userService.deleteUser(id);

    if (user.isError) throw user.error;

    return this.response({
      message: 'Account Updated',
      data: user.data,
    })
  }
}
