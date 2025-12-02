import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiBody,
    ApiParam,
    ApiQuery,
    ApiConsumes,
    ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FirebaseGuard } from '@alpha018/nestjs-firebase-auth';
import { FirebaseUser, StreakInterceptor } from 'src/common';
import { auth } from 'firebase-admin';
import { BaseController } from 'src/common';
import { VisionBoardService } from './vision-board.service';
import { AddVisionDto } from './dto';

@UseGuards(FirebaseGuard)
@UseInterceptors(StreakInterceptor)
@ApiBearerAuth('firebase')
@ApiTags('Vision Board')
@Controller('vision-board')
export class VisionBoardController extends BaseController {
    constructor(private readonly visionBoardService: VisionBoardService) {
        super();
    }

    @Post('visions')
    @UseInterceptors(FileInterceptor('image'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: 'Add a reflection session to vision board',
        description: 'Adds an approved reflection session to the vision board with an uploaded image. The reflection session must be in APPROVED status.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                reflectionSessionId: {
                    type: 'string',
                    description: 'The ID of the reflection session to add',
                    example: 'reflection-session-id-123',
                },
                image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file to display with the vision (optional, can be uploaded later)',
                },
            },
            required: ['reflectionSessionId'],
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Vision added successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request or reflection session not in APPROVED status',
    })
    @ApiResponse({
        status: 404,
        description: 'User or reflection session not found',
    })
    async addVision(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Body() dto: AddVisionDto,
        @UploadedFile() imageFile?: Express.Multer.File,
    ) {
        const result = await this.visionBoardService.addVision(
            user.uid,
            dto.reflectionSessionId,
            imageFile,
        );
        if (result.isError) throw result.error;

        return this.response({
            message: 'Vision added successfully',
            data: result.data,
        });
    }

    @Get('visions')
    @ApiOperation({
        summary: 'Get all visions for user\'s vision board',
        description: 'Retrieves a paginated list of all visions in the user\'s vision board.',
    })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number (default: 1)',
        example: 1,
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of items per page (default: 10, max: 100)',
        example: 10,
    })
    @ApiResponse({
        status: 200,
        description: 'Visions retrieved successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    async getAllVisions(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNumber = page ? parseInt(page, 10) : 1;
        const limitNumber = limit ? parseInt(limit, 10) : 10;

        const result = await this.visionBoardService.getAllVisions(
            user.uid,
            pageNumber,
            limitNumber,
        );
        if (result.isError) throw result.error;

        return this.response({
            message: 'Visions retrieved successfully',
            data: result.data,
        });
    }

    @Get('visions/:id')
    @ApiOperation({
        summary: 'Get single vision by ID',
        description: 'Retrieves a single vision from the vision board by its ID.',
    })
    @ApiParam({
        name: 'id',
        description: 'The unique identifier of the vision',
        example: 'vision-id-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Vision retrieved successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Vision not found',
    })
    async getVisionById(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('id') visionId: string,
    ) {
        const result = await this.visionBoardService.getVisionById(user.uid, visionId);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Vision retrieved successfully',
            data: result.data,
        });
    }

    @Post('video')
    @UseInterceptors(FileInterceptor('video'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: 'Upload/update video for vision board',
        description: 'Uploads or updates the video compilation for the user\'s vision board.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                video: {
                    type: 'string',
                    format: 'binary',
                    description: 'Video file containing all visions',
                },
            },
            required: ['video'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Video uploaded successfully',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                userId: { type: 'string' },
                videoUrl: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request or failed to upload video',
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    async uploadVisionBoardVideo(
        @FirebaseUser() user: auth.DecodedIdToken,
        @UploadedFile() videoFile?: Express.Multer.File,
    ) {
        if (!videoFile) {
            throw new BadRequestException('Video file is required');
        }

        const result = await this.visionBoardService.uploadVisionBoardVideo(user.uid, videoFile);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Video uploaded successfully',
            data: result.data,
        });
    }

    @Get('video')
    @ApiOperation({
        summary: 'Get video URL for vision board',
        description: 'Retrieves the video URL for the user\'s vision board if one has been uploaded.',
    })
    @ApiResponse({
        status: 200,
        description: 'Video URL retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                videoUrl: { type: 'string', nullable: true },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    async getVideo(@FirebaseUser() user: auth.DecodedIdToken) {
        const result = await this.visionBoardService.getVideo(user.uid);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Video URL retrieved successfully',
            data: result.data,
        });
    }

    @Post('visions/:id/image')
    @UseInterceptors(FileInterceptor('image'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: 'Update image for a vision',
        description: 'Uploads or updates the image for a vision in the vision board.',
    })
    @ApiParam({
        name: 'id',
        description: 'The unique identifier of the vision',
        example: 'vision-id-123',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file to display with the vision',
                },
            },
            required: ['image'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Image updated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request or failed to upload image',
    })
    @ApiResponse({
        status: 404,
        description: 'Vision not found',
    })
    async updateVisionImage(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('id') visionId: string,
        @UploadedFile() imageFile?: Express.Multer.File,
    ) {
        if (!imageFile) {
            throw new BadRequestException('Image file is required');
        }

        const result = await this.visionBoardService.updateVisionImage(
            user.uid,
            visionId,
            imageFile,
        );
        if (result.isError) throw result.error;

        return this.response({
            message: 'Image updated successfully',
            data: result.data,
        });
    }

    @Delete('visions/:id')
    @ApiOperation({
        summary: 'Remove vision from board',
        description: 'Removes a vision from the user\'s vision board.',
    })
    @ApiParam({
        name: 'id',
        description: 'The unique identifier of the vision to remove',
        example: 'vision-id-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Vision removed successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Vision not found',
    })
    async removeVision(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('id') visionId: string,
    ) {
        const result = await this.visionBoardService.removeVision(user.uid, visionId);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Vision removed successfully',
            data: result.data,
        });
    }
}

