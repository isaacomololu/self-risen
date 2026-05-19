import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import { FirebaseGuard } from '@alpha018/nestjs-firebase-auth';
import { auth } from 'firebase-admin';
import { BaseController, FirebaseUser, StreakInterceptor } from 'src/common';
import { AffirmationLoopService } from './affirmation-loop.service';
import { CreateAffirmationLoopDto, UpdateLoopRemindersDto } from './dto';

@UseGuards(FirebaseGuard)
@UseInterceptors(StreakInterceptor)
@ApiBearerAuth('firebase')
@ApiTags('Reflection')
@Controller('reflection/loops')
export class AffirmationLoopController extends BaseController {
    constructor(private readonly affirmationLoopService: AffirmationLoopService) {
        super();
    }

    @Post()
    @ApiOperation({ summary: 'Generate affirmation audio loop' })
    async createLoop(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Body() dto: CreateAffirmationLoopDto,
    ) {
        const result = await this.affirmationLoopService.createLoop(user.uid, dto);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Affirmation loop generation started',
            data: result.data,
        });
    }

    @Get()
    @ApiOperation({ summary: 'List affirmation loops for the current user' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async listLoops(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        const result = await this.affirmationLoopService.listLoops(
            user.uid,
            page ? Number(page) : 1,
            limit ? Number(limit) : 10,
        );
        if (result.isError) throw result.error;

        return this.response({
            message: 'Affirmation loops retrieved',
            data: result.data,
        });
    }

    @Patch('reminders')
    @ApiOperation({ summary: 'Update morning/evening loop reminder times' })
    async updateReminders(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Body() dto: UpdateLoopRemindersDto,
    ) {
        const result = await this.affirmationLoopService.updateReminders(
            user.uid,
            dto,
        );
        if (result.isError) throw result.error;

        return this.response({
            message: 'Loop reminders updated',
            data: result.data,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get affirmation loop by ID (poll status)' })
    @ApiParam({ name: 'id', description: 'Loop ID' })
    async getLoop(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('id') id: string,
    ) {
        const result = await this.affirmationLoopService.getLoopById(user.uid, id);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Affirmation loop retrieved',
            data: result.data,
        });
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete an affirmation loop' })
    @ApiParam({ name: 'id', description: 'Loop ID' })
    async deleteLoop(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('id') id: string,
    ) {
        const result = await this.affirmationLoopService.deleteLoop(user.uid, id);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Affirmation loop deleted',
            data: result.data,
        });
    }
}
