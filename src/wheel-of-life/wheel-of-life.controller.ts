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
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiBody,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
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
import { StreakInterceptor } from 'src/common';

@UseGuards(FirebaseGuard)
@UseInterceptors(StreakInterceptor)
@ApiBearerAuth('firebase')
@ApiTags('Wheel of Life')
@Controller('wheel-of-life')
export class WheelOfLifeController extends BaseController {
    constructor(private readonly wheelService: WheelOfLifeService) {
        super();
    }

    @Get()
    @ApiOperation({
        summary: 'Get or create Wheel of Life',
        description: 'Retrieves the user\'s Wheel of Life with all categories. If no wheel exists, creates one with default categories.',
    })
    async getWheel(@FirebaseUser() user: auth.DecodedIdToken) {
        const result = await this.wheelService.getOrCreateWheel(user.uid);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Wheel of Life retrieved',
            data: result.data,
        });
    }

    @Patch('categories/:categoryId')
    @ApiOperation({
        summary: 'Update a category',
        description: 'Updates the name or order of an existing category in the Wheel of Life.',
    })
    @ApiParam({
        name: 'categoryId',
        description: 'The unique identifier of the category to update',
        example: 'cat-id-123',
    })
    @ApiBody({
        type: UpdateCategoryDto,
        examples: {
            updateName: {
                summary: 'Update category name',
                value: {
                    name: 'Health & Fitness',
                },
            },
            updateOrder: {
                summary: 'Update category order',
                value: {
                    order: 2,
                },
            },
            updateBoth: {
                summary: 'Update both name and order',
                value: {
                    name: 'Career & Professional Development',
                    order: 3,
                },
            },
        },
    })
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
    @ApiOperation({
        summary: 'Add a new category',
        description: 'Adds a new custom category to the user\'s Wheel of Life. If order is not provided, it will be appended at the end.',
    })
    @ApiBody({
        type: AddCategoryDto,
        examples: {
            withOrder: {
                summary: 'Add category with specific order',
                value: {
                    name: 'Family Time',
                    order: 5,
                },
            },
            withoutOrder: {
                summary: 'Add category (auto-ordered)',
                value: {
                    name: 'Creative Pursuits',
                },
            },
        },
    })
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
    @ApiOperation({
        summary: 'Delete a category',
        description: 'Permanently deletes a category from the Wheel of Life.',
    })
    @ApiParam({
        name: 'categoryId',
        description: 'The unique identifier of the category to delete',
        example: 'cat-id-123',
    })
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
    @ApiOperation({
        summary: 'Update assessment scores',
        description: 'Updates or creates a new assessment with scores (1-10) for each category. Returns the assessment and breakdown analysis.',
    })
    @ApiBody({
        type: UpdateScoresDto,
        examples: {
            fullAssessment: {
                summary: 'Complete assessment with all categories',
                value: {
                    scores: {
                        'cat-id-1': 8,
                        'cat-id-2': 6,
                        'cat-id-3': 7,
                        'cat-id-4': 5,
                        'cat-id-5': 9,
                        'cat-id-6': 4,
                        'cat-id-7': 7,
                        'cat-id-8': 6,
                    },
                },
            },
            partialAssessment: {
                summary: 'Assessment with subset of categories',
                value: {
                    scores: {
                        'cat-id-1': 9,
                        'cat-id-2': 7,
                        'cat-id-3': 8,
                    },
                },
            },
        },
    })
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
    @ApiOperation({
        summary: 'Get assessment breakdown',
        description: 'Retrieves a detailed breakdown of the latest assessment, including strongest/weakest areas, imbalance score, and insights for each category.',
    })
    async getBreakdown(@FirebaseUser() user: auth.DecodedIdToken) {
        const result = await this.wheelService.getAssessmentBreakdown(user.uid);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Assessment breakdown',
            data: result.data,
        });
    }

    @Get('history')
    @ApiOperation({
        summary: 'Get assessment history',
        description: 'Retrieves all historical assessments for the user, ordered by most recent first. Includes full wheel and category details.',
    })
    async getHistory(@FirebaseUser() user: auth.DecodedIdToken) {
        const result = await this.wheelService.getAssessmentHistory(user.uid);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Assessment history',
            data: result.data,
        });
    }
}

