import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { BaseController } from 'src/common';
import { AuthGuard, FirebaseUser } from 'src/common/';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { auth } from 'firebase-admin';
import { FirebaseGuard } from '@alpha018/nestjs-firebase-auth';
import { ChangeNameDto, ChangeUsernameDto, UploadAvatarDto } from './dto';
import { FileInterceptor } from '@nestjs/platform-express';

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

  @Patch('change-name')
  async changeName(@FirebaseUser() user: auth.DecodedIdToken, @Body() form: ChangeNameDto) {
    const updatedUser = await this.userService.changeName(user.uid, form);

    if (updatedUser.isError) throw updatedUser.error;

    return this.response({
      message: 'Names Updated',
      data: updatedUser.data,
    })
  }


  @Patch('change-username')
  async changeUsername(@FirebaseUser() user: auth.DecodedIdToken, @Body() form: ChangeUsernameDto) {
    const updatedUser = await this.userService.changeUsername(user.uid, form);

    if (updatedUser.isError) throw updatedUser.error;

    return this.response({
      message: 'Names Updated',
      data: user.data,
    })
  }

  @Patch('upload-avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload user avatar',
    description: 'Upload a new avatar image for the authenticated user. Supported formats: JPEG, PNG, GIF, WebP, SVG. Maximum file size: 10MB. The old avatar will be replaced if one exists.',
  })
  @ApiBody({
    description: 'Avatar image file',
    type: UploadAvatarDto,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (JPEG, PNG, GIF, WebP, SVG)',
          example: 'avatar.jpg'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Avatar Updated'
        },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            firebaseId: {
              type: 'string',
              example: 'firebase-user-id-123'
            },
            name: {
              type: 'string',
              example: 'John Doe'
            },
            username: {
              type: 'string',
              example: 'johndoe',
              nullable: true
            },
            email: {
              type: 'string',
              example: 'john@example.com'
            },
            avatar: {
              type: 'string',
              example: 'https://storage.example.com/images/avatars/user-id/avatar.jpg',
              description: 'URL of the uploaded avatar image'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - No file provided or invalid file type/size',
    schema: {
      type: 'object',
      properties: {
        statusCode: {
          type: 'number',
          example: 400
        },
        message: {
          type: 'string',
          example: 'No file provided',
          description: 'Error message - could be: "No file provided", "Invalid file type", or "File size exceeds maximum allowed size of 10MB for image"'
        },
        error: {
          type: 'string',
          example: 'Bad Request'
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      type: 'object',
      properties: {
        statusCode: {
          type: 'number',
          example: 401
        },
        message: {
          type: 'string',
          example: 'Unauthorized'
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: {
          type: 'number',
          example: 404
        },
        message: {
          type: 'string',
          example: 'User not found'
        },
        error: {
          type: 'string',
          example: 'Not Found'
        }
      }
    }
  })
  async uploadAvatar(
    @FirebaseUser() user: auth.DecodedIdToken,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const updatedUser = await this.userService.uploadAvatar(user.uid, file);

    if (updatedUser.isError) throw updatedUser.error;

    return this.response({
      message: 'Avatar Updated',
      data: updatedUser.data,
    })
  }

  @Delete('delete-account')
  async remove(@FirebaseUser() user: auth.DecodedIdToken) {
    const deletedUser = await this.userService.deleteUser(user.uid);

    if (deletedUser.isError) throw deletedUser.error;

    return this.response({
      message: 'Account Updated',
      data: user.data,
    })
  }
}
