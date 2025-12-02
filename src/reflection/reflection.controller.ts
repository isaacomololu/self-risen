import {
    Controller,
    Get,
    Post,
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
import { ReflectionService } from './reflection.service';
import { CreateSessionDto, SubmitBeliefDto, ReflectionSessionResponseDto, ReRecordBeliefDto } from './dto';

@UseGuards(FirebaseGuard)
@UseInterceptors(StreakInterceptor)
@ApiBearerAuth('firebase')
@ApiTags('Reflection')
@Controller('reflection')
export class ReflectionController extends BaseController {
    constructor(private readonly reflectionService: ReflectionService) {
        super();
    }

    @Post('sessions')
    @ApiOperation({
        summary: 'Create a new reflection session',
        description: 'Creates a new reflection session for a specific Wheel of Life category. Returns the session with a generated prompt.',
    })
    @ApiBody({ type: CreateSessionDto })
    @ApiResponse({
        status: 201,
        description: 'Reflection session created successfully',
        type: ReflectionSessionResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: 'User or category not found',
    })
    async createSession(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Body() dto: CreateSessionDto,
    ) {
        const result = await this.reflectionService.createSession(user.uid, dto);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Reflection session created',
            data: result.data,
        });
    }

    @Get('sessions/:sessionId')
    @ApiOperation({
        summary: 'Get reflection session details',
        description: 'Retrieves a reflection session by ID. User must own the session.',
    })
    @ApiParam({
        name: 'sessionId',
        description: 'The unique identifier of the reflection session',
        example: 'session-id-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Reflection session retrieved successfully',
        type: ReflectionSessionResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Reflection session not found',
    })
    async getSessionById(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('sessionId') sessionId: string,
    ) {
        const result = await this.reflectionService.getSessionById(user.uid, sessionId);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Reflection session retrieved',
            data: result.data,
        });
    }

    @Get('sessions')
    @ApiOperation({
        summary: 'Get all reflection sessions',
        description: 'Retrieves all reflection sessions for the current user.',
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
        description: 'Reflection sessions retrieved successfully',
        schema: {
            example: {
                message: 'Reflection sessions retrieved',
                data: {
                    data: [],
                    pagination: {
                        page: 1,
                        limit: 10,
                        total: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false,
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    async getAllSessions(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNumber = page ? parseInt(page, 10) : 1;
        const limitNumber = limit ? parseInt(limit, 10) : 10;

        const result = await this.reflectionService.getAllSessions(
            user.uid,
            pageNumber,
            limitNumber,
        );
        if (result.isError) throw result.error;

        return this.response({
            message: 'Reflection sessions retrieved',
            data: result.data,
        });
    }

    @Post('sessions/:sessionId/belief')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data', 'application/json')
    @ApiOperation({
        summary: 'Submit belief for reflection session',
        description: 'Submits a belief (text or audio) for a reflection session. If audio is provided, it will be transcribed automatically.',
    })
    @ApiParam({
        name: 'sessionId',
        description: 'The unique identifier of the reflection session',
        example: 'session-id-123',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                text: {
                    type: 'string',
                    description: 'Text input of the user\'s belief. Optional if audio file is provided.',
                    example: 'Money is stressful and scarce.',
                },
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Audio file containing the user\'s belief. Optional if text is provided.',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Belief submitted successfully',
        type: ReflectionSessionResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request - either text or audio file must be provided',
    })
    @ApiResponse({
        status: 404,
        description: 'Reflection session not found',
    })
    async submitBelief(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('sessionId') sessionId: string,
        @Body() dto: SubmitBeliefDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        if (!file && !dto.text) {
            throw new BadRequestException('Either text or audio file must be provided');
        }

        const result = await this.reflectionService.submitBelief(
            user.uid,
            sessionId,
            dto,
            file,
        );
        if (result.isError) throw result.error;

        return this.response({
            message: 'Belief submitted successfully',
            data: result.data,
        });
    }

    @Post('sessions/:sessionId/generate-affirmation')
    @ApiOperation({
        summary: 'Generate affirmation from belief',
        description: 'Transforms the user\'s limiting belief into an empowering affirmation using AI. Session must be in BELIEF_CAPTURED status.',
    })
    @ApiParam({
        name: 'sessionId',
        description: 'The unique identifier of the reflection session',
        example: 'session-id-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Affirmation generated successfully',
        type: ReflectionSessionResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Session not in correct status or missing belief text',
    })
    @ApiResponse({
        status: 404,
        description: 'Reflection session not found',
    })
    @ApiResponse({
        status: 500,
        description: 'Failed to generate affirmation',
    })
    async generateAffirmation(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('sessionId') sessionId: string,
    ) {
        const result = await this.reflectionService.generateAffirmation(user.uid, sessionId);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Affirmation generated successfully',
            data: result.data,
        });
    }

    @Post('sessions/:sessionId/re-record-belief')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data', 'application/json')
    @ApiOperation({
        summary: 'Re-record belief for reflection session',
        description: 'Allows user to re-record their belief. If session has affirmation generated, it will be reset to BELIEF_CAPTURED status.',
    })
    @ApiParam({
        name: 'sessionId',
        description: 'The unique identifier of the reflection session',
        example: 'session-id-123',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                text: {
                    type: 'string',
                    description: 'Text input of the user\'s belief. Optional if audio file is provided.',
                    example: 'Money is stressful and scarce.',
                },
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Audio file containing the user\'s belief. Optional if text is provided.',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Belief re-recorded successfully',
        type: ReflectionSessionResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request or session not in correct status',
    })
    @ApiResponse({
        status: 404,
        description: 'Reflection session not found',
    })
    async reRecordBelief(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('sessionId') sessionId: string,
        @Body() dto: ReRecordBeliefDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        if (!file && !dto.text) {
            throw new BadRequestException('Either text or audio file must be provided');
        }

        const result = await this.reflectionService.reRecordBelief(
            user.uid,
            sessionId,
            dto,
            file,
        );
        if (result.isError) throw result.error;

        return this.response({
            message: 'Belief re-recorded successfully',
            data: result.data,
        });
    }

    @Post('sessions/:sessionId/record-affirmation')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: 'Record user voice for affirmation',
        description: 'Uploads user\'s voice recording of the affirmation. This will be used for playback instead of AI-generated audio.',
    })
    @ApiParam({
        name: 'sessionId',
        description: 'The unique identifier of the reflection session',
        example: 'session-id-123',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Audio file containing the user\'s voice recording of the affirmation.',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Affirmation recorded successfully',
        type: ReflectionSessionResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request or session not in correct status',
    })
    @ApiResponse({
        status: 404,
        description: 'Reflection session not found',
    })
    async recordAffirmation(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('sessionId') sessionId: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('Audio file is required');
        }

        const result = await this.reflectionService.recordUserAffirmation(
            user.uid,
            sessionId,
            file,
        );
        if (result.isError) throw result.error;

        return this.response({
            message: 'Affirmation recorded successfully',
            data: result.data,
        });
    }

    @Post('sessions/:sessionId/track-playback')
    @ApiOperation({
        summary: 'Track affirmation playback',
        description: 'Tracks when user listens to the affirmation. Increments playback count and updates last played timestamp.',
    })
    @ApiParam({
        name: 'sessionId',
        description: 'The unique identifier of the reflection session',
        example: 'session-id-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Playback tracked successfully',
        type: ReflectionSessionResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Reflection session not found',
    })
    async trackPlayback(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('sessionId') sessionId: string,
    ) {
        const result = await this.reflectionService.trackPlayback(user.uid, sessionId);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Playback tracked successfully',
            data: result.data,
        });
    }
}

