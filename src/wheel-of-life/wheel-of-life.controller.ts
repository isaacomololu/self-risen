import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FirebaseGuard } from '@alpha018/nestjs-firebase-auth';
import { FirebaseUser } from 'src/common';
import { auth } from 'firebase-admin';
import { BaseController } from 'src/common';
import { WheelOfLifeService } from './wheel-of-life.service';
import {
    UpdateCategoryDto,
    AddCategoryDto,
    UpdateScoresDto,
    ChooseFocusDto,
    UpdateFocusDto,
} from './dto';

@UseGuards(FirebaseGuard)
@ApiBearerAuth('firebase')
@Controller('wheel-of-life')
export class WheelOfLifeController extends BaseController {
    constructor(private readonly wheelService: WheelOfLifeService) {
        super();
    }

    @Get()
    async getWheel(@FirebaseUser() user: auth.DecodedIdToken) {
        const result = await this.wheelService.getOrCreateWheel(user.uid);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Wheel of Life retrieved',
            data: result.data,
        });
    }

    @Patch('categories/:categoryId')
    async updateCategory(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('categoryId') categoryId: string,
        @Body() payload: UpdateCategoryDto,
    ) {
        const result = await this.wheelService.updateCategory(
            user.uid,
            categoryId,
            payload,
        );
        if (result.isError) throw result.error;

        return this.response({
            message: 'Category updated',
            data: result.data,
        });
    }

    @Post('categories')
    async addCategory(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Body() payload: AddCategoryDto,
    ) {
        const result = await this.wheelService.addCategory(user.uid, payload);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Category added',
            data: result.data,
        });
    }

    @Delete('categories/:categoryId')
    async deleteCategory(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('categoryId') categoryId: string,
    ) {
        const result = await this.wheelService.deleteCategory(user.uid, categoryId);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Category deleted',
            data: result.data,
        });
    }

    @Post('scores')
    async updateScores(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Body() payload: UpdateScoresDto,
    ) {
        const result = await this.wheelService.updateScores(user.uid, payload);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Scores updated',
            data: result.data,
        });
    }

    @Get('breakdown')
    async getBreakdown(@FirebaseUser() user: auth.DecodedIdToken) {
        const result = await this.wheelService.getAssessmentBreakdown(user.uid);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Assessment breakdown',
            data: result.data,
        });
    }

    @Post('focus')
    async chooseFocus(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Body() payload: ChooseFocusDto,
    ) {
        const result = await this.wheelService.chooseFocus(user.uid, payload);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Focus created',
            data: result.data,
        });
    }

    @Get('focuses')
    async getFocuses(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Query('activeOnly') activeOnly?: string,
    ) {
        const activeOnlyBool = activeOnly === 'true' ? true : activeOnly === 'false' ? false : undefined;
        const result = await this.wheelService.getFocuses(user.uid, activeOnlyBool);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Focuses retrieved',
            data: result.data,
        });
    }

    @Patch('focuses/:focusId')
    async completeFocus(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('focusId') focusId: string,
    ) {
        const result = await this.wheelService.completeFocus(user.uid, focusId);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Focus updated',
            data: result.data,
        });
    }

    @Delete('focuses/:focusId')
    async deleteFocus(
        @FirebaseUser() user: auth.DecodedIdToken,
        @Param('focusId') focusId: string,
    ) {
        const result = await this.wheelService.deleteFocus(user.uid, focusId);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Focus deleted',
            data: result.data,
        });
    }

    @Get('history')
    async getHistory(@FirebaseUser() user: auth.DecodedIdToken) {
        const result = await this.wheelService.getAssessmentHistory(user.uid);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Assessment history',
            data: result.data,
        });
    }
}

