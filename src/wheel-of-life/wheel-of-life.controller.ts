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

@UseGuards(FirebaseGuard)
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
    @ApiResponse({
        status: 200,
        description: 'Wheel of Life retrieved successfully',
        schema: {
            example: {
                message: 'Wheel of Life retrieved',
                data: {
                    id: 'wheel-id-123',
                    userId: 'user-id-456',
                    createdAt: '2024-01-15T10:30:00.000Z',
                    updatedAt: '2024-01-15T10:30:00.000Z',
                    categories: [
                        {
                            id: 'cat-id-1',
                            wheelId: 'wheel-id-123',
                            name: 'Health & Well-being',
                            order: 0,
                            createdAt: '2024-01-15T10:30:00.000Z',
                            updatedAt: '2024-01-15T10:30:00.000Z',
                        },
                        {
                            id: 'cat-id-2',
                            wheelId: 'wheel-id-123',
                            name: 'Relationships',
                            order: 1,
                            createdAt: '2024-01-15T10:30:00.000Z',
                            updatedAt: '2024-01-15T10:30:00.000Z',
                        },
                    ],
                },
            },
        },
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
    @ApiResponse({
        status: 200,
        description: 'Category updated successfully',
        schema: {
            example: {
                message: 'Category updated',
                data: {
                    id: 'cat-id-123',
                    wheelId: 'wheel-id-456',
                    name: 'Health & Fitness',
                    order: 2,
                    createdAt: '2024-01-15T10:30:00.000Z',
                    updatedAt: '2024-01-20T14:45:00.000Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Category not found',
        schema: {
            example: {
                statusCode: 404,
                message: 'Category not found',
                error: 'Not Found',
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
    @ApiResponse({
        status: 201,
        description: 'Category added successfully',
        schema: {
            example: {
                message: 'Category added',
                data: {
                    id: 'cat-id-789',
                    wheelId: 'wheel-id-456',
                    name: 'Family Time',
                    order: 5,
                    createdAt: '2024-01-20T15:00:00.000Z',
                    updatedAt: '2024-01-20T15:00:00.000Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Wheel not found',
        schema: {
            example: {
                statusCode: 404,
                message: 'Wheel not found',
                error: 'Not Found',
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
    @ApiResponse({
        status: 200,
        description: 'Category deleted successfully',
        schema: {
            example: {
                message: 'Category deleted',
                data: null,
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Category not found',
        schema: {
            example: {
                statusCode: 404,
                message: 'Category not found',
                error: 'Not Found',
            },
        },
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
    @ApiResponse({
        status: 200,
        description: 'Scores updated successfully',
        schema: {
            example: {
                message: 'Scores updated',
                data: {
                    assessment: {
                        id: 'assessment-id-123',
                        wheelId: 'wheel-id-456',
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
                        strongestArea: 'cat-id-5',
                        weakestArea: 'cat-id-6',
                        imbalanceScore: 0.75,
                        createdAt: '2024-01-20T16:00:00.000Z',
                        updatedAt: '2024-01-20T16:00:00.000Z',
                    },
                    breakdown: {
                        strongestArea: {
                            categoryId: 'cat-id-5',
                            categoryName: 'Personal Growth',
                            score: 9,
                        },
                        weakestArea: {
                            categoryId: 'cat-id-6',
                            categoryName: 'Leisure & Fun',
                            score: 4,
                        },
                        imbalanceScore: 0.75,
                        averageScore: 6.5,
                        categoryInsights: [
                            {
                                categoryId: 'cat-id-1',
                                categoryName: 'Health & Well-being',
                                score: 8,
                                isStrongest: false,
                                isWeakest: false,
                            },
                            {
                                categoryId: 'cat-id-6',
                                categoryName: 'Leisure & Fun',
                                score: 4,
                                isStrongest: false,
                                isWeakest: true,
                            },
                        ],
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid scores or category not found',
        schema: {
            example: {
                statusCode: 400,
                message: 'Scores must be between 1 and 10',
                error: 'Bad Request',
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
    @ApiResponse({
        status: 200,
        description: 'Assessment breakdown retrieved successfully',
        schema: {
            example: {
                message: 'Assessment breakdown',
                data: {
                    strongestArea: {
                        categoryId: 'cat-id-5',
                        categoryName: 'Personal Growth',
                        score: 9,
                    },
                    weakestArea: {
                        categoryId: 'cat-id-6',
                        categoryName: 'Leisure & Fun',
                        score: 4,
                    },
                    imbalanceScore: 0.75,
                    averageScore: 6.5,
                    categoryInsights: [
                        {
                            categoryId: 'cat-id-1',
                            categoryName: 'Health & Well-being',
                            score: 8,
                            isStrongest: false,
                            isWeakest: false,
                        },
                        {
                            categoryId: 'cat-id-2',
                            categoryName: 'Relationships',
                            score: 6,
                            isStrongest: false,
                            isWeakest: false,
                        },
                        {
                            categoryId: 'cat-id-5',
                            categoryName: 'Personal Growth',
                            score: 9,
                            isStrongest: true,
                            isWeakest: false,
                        },
                        {
                            categoryId: 'cat-id-6',
                            categoryName: 'Leisure & Fun',
                            score: 4,
                            isStrongest: false,
                            isWeakest: true,
                        },
                    ],
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'No assessment found',
        schema: {
            example: {
                statusCode: 404,
                message: 'No assessment found. Please complete your scores first.',
                error: 'Not Found',
            },
        },
    })
    async getBreakdown(@FirebaseUser() user: auth.DecodedIdToken) {
        const result = await this.wheelService.getAssessmentBreakdown(user.uid);
        if (result.isError) throw result.error;

        return this.response({
            message: 'Assessment breakdown',
            data: result.data,
        });
    }

    @Post('focus')
    @ApiOperation({
        summary: 'Choose a focus area',
        description: 'Creates a new active focus for a specific category. Only one focus per category is allowed.',
    })
    @ApiBody({
        type: ChooseFocusDto,
        examples: {
            chooseFocus: {
                summary: 'Choose a category to focus on',
                value: {
                    categoryId: 'cat-id-6',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Focus created successfully',
        schema: {
            example: {
                message: 'Focus created',
                data: {
                    focus: {
                        id: 'focus-id-123',
                        wheelId: 'wheel-id-456',
                        categoryId: 'cat-id-6',
                        categoryName: 'Leisure & Fun',
                        assessmentId: 'assessment-id-789',
                        isActive: true,
                        startedAt: '2024-01-20T16:30:00.000Z',
                        createdAt: '2024-01-20T16:30:00.000Z',
                        updatedAt: '2024-01-20T16:30:00.000Z',
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Focus already exists for this category',
        schema: {
            example: {
                statusCode: 400,
                message: 'Focus already exists',
                error: 'Bad Request',
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Category not found',
        schema: {
            example: {
                statusCode: 404,
                message: 'Category not found',
                error: 'Not Found',
            },
        },
    })
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
    @ApiOperation({
        summary: 'Get all focuses',
        description: 'Retrieves all focuses for the user. Optionally filter by active status.',
    })
    @ApiQuery({
        name: 'activeOnly',
        required: false,
        description: 'Filter focuses by active status. Use "true" for active only, "false" for inactive only, or omit for all.',
        example: 'true',
        type: String,
    })
    @ApiResponse({
        status: 200,
        description: 'Focuses retrieved successfully',
        schema: {
            example: {
                message: 'Focuses retrieved',
                data: {
                    focuses: [
                        {
                            id: 'focus-id-123',
                            wheelId: 'wheel-id-456',
                            categoryId: 'cat-id-6',
                            category: {
                                id: 'cat-id-6',
                                name: 'Leisure & Fun',
                                order: 5,
                            },
                            isActive: true,
                            startedAt: '2024-01-20T16:30:00.000Z',
                            completedAt: null,
                            createdAt: '2024-01-20T16:30:00.000Z',
                            updatedAt: '2024-01-20T16:30:00.000Z',
                        },
                        {
                            id: 'focus-id-124',
                            wheelId: 'wheel-id-456',
                            categoryId: 'cat-id-2',
                            category: {
                                id: 'cat-id-2',
                                name: 'Relationships',
                                order: 1,
                            },
                            isActive: false,
                            startedAt: '2024-01-15T10:00:00.000Z',
                            completedAt: '2024-01-18T14:00:00.000Z',
                            createdAt: '2024-01-15T10:00:00.000Z',
                            updatedAt: '2024-01-18T14:00:00.000Z',
                        },
                    ],
                    activeCount: 1,
                    completedCount: 1,
                },
            },
        },
    })
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
    @ApiOperation({
        summary: 'Complete a focus',
        description: 'Marks a focus as completed by setting isActive to false and recording the completion date.',
    })
    @ApiParam({
        name: 'focusId',
        description: 'The unique identifier of the focus to complete',
        example: 'focus-id-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Focus completed successfully',
        schema: {
            example: {
                message: 'Focus updated',
                data: {
                    id: 'focus-id-123',
                    wheelId: 'wheel-id-456',
                    categoryId: 'cat-id-6',
                    category: {
                        id: 'cat-id-6',
                        name: 'Leisure & Fun',
                        order: 5,
                    },
                    isActive: false,
                    startedAt: '2024-01-20T16:30:00.000Z',
                    completedAt: '2024-01-25T10:00:00.000Z',
                    createdAt: '2024-01-20T16:30:00.000Z',
                    updatedAt: '2024-01-25T10:00:00.000Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Focus not found',
        schema: {
            example: {
                statusCode: 404,
                message: 'Focus not found',
                error: 'Not Found',
            },
        },
    })
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
    @ApiOperation({
        summary: 'Delete a focus',
        description: 'Permanently deletes a focus from the Wheel of Life.',
    })
    @ApiParam({
        name: 'focusId',
        description: 'The unique identifier of the focus to delete',
        example: 'focus-id-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Focus deleted successfully',
        schema: {
            example: {
                message: 'Focus deleted',
                data: null,
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Focus not found',
        schema: {
            example: {
                statusCode: 404,
                message: 'Focus not found',
                error: 'Not Found',
            },
        },
    })
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
    @ApiOperation({
        summary: 'Get assessment history',
        description: 'Retrieves all historical assessments for the user, ordered by most recent first. Includes full wheel and category details.',
    })
    @ApiResponse({
        status: 200,
        description: 'Assessment history retrieved successfully',
        schema: {
            example: {
                message: 'Assessment history',
                data: [
                    {
                        id: 'assessment-id-123',
                        wheelId: 'wheel-id-456',
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
                        strongestArea: 'cat-id-5',
                        weakestArea: 'cat-id-6',
                        imbalanceScore: 0.75,
                        createdAt: '2024-01-20T16:00:00.000Z',
                        updatedAt: '2024-01-20T16:00:00.000Z',
                        wheel: {
                            id: 'wheel-id-456',
                            userId: 'user-id-789',
                            categories: [
                                {
                                    id: 'cat-id-1',
                                    name: 'Health & Well-being',
                                    order: 0,
                                },
                                {
                                    id: 'cat-id-2',
                                    name: 'Relationships',
                                    order: 1,
                                },
                            ],
                        },
                    },
                    {
                        id: 'assessment-id-122',
                        wheelId: 'wheel-id-456',
                        scores: {
                            'cat-id-1': 7,
                            'cat-id-2': 5,
                            'cat-id-3': 6,
                        },
                        strongestArea: 'cat-id-1',
                        weakestArea: 'cat-id-2',
                        imbalanceScore: 0.65,
                        createdAt: '2024-01-15T10:00:00.000Z',
                        updatedAt: '2024-01-15T10:00:00.000Z',
                        wheel: {
                            id: 'wheel-id-456',
                            userId: 'user-id-789',
                            categories: [
                                {
                                    id: 'cat-id-1',
                                    name: 'Health & Well-being',
                                    order: 0,
                                },
                            ],
                        },
                    },
                ],
            },
        },
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

