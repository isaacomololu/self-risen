import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseProvider } from 'src/database/database.provider';
import { BaseService } from 'src/common';
import { StorageService, FileType } from 'src/common/storage/storage.service';
import { AddVisionDto } from './dto';
import { ReflectionSessionStatus } from '@prisma/client';

@Injectable()
export class VisionBoardService extends BaseService {
    private readonly logger = new Logger(VisionBoardService.name);

    constructor(
        private prisma: DatabaseProvider,
        private storageService: StorageService,
    ) {
        super();
    }


    async addVision(
        firebaseId: string,
        reflectionSessionId?: string,
        imageFile?: Express.Multer.File,
    ) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        // Validate that at least one parameter is provided
        if (!reflectionSessionId && !imageFile) {
            return this.HandleError(
                new BadRequestException('Either reflectionSessionId or imageFile must be provided'),
            );
        }

        type ReflectionSessionWithCategory = {
            id: string;
            status: ReflectionSessionStatus;
            approvedAffirmation: string | null;
            generatedAffirmation: string | null;
            prompt: string;
            category: {
                id: string;
                name: string;
            };
        };

        let reflectionSession: ReflectionSessionWithCategory | null = null;
        if (reflectionSessionId) {
            const foundSession = await this.prisma.reflectionSession.findFirst({
                where: {
                    id: reflectionSessionId,
                    userId: user.id,
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            if (!foundSession) {
                return this.HandleError(new NotFoundException('Reflection session not found'));
            }

            if (foundSession.status !== ReflectionSessionStatus.AFFIRMATION_GENERATED) {
                return this.HandleError(
                    new BadRequestException('Reflection session must be in AFFIRMATION_GENERATED status to add to vision board'),
                );
            }

            // Check if already added to vision board
            const existingItem = await this.prisma.vision.findUnique({
                where: { reflectionSessionId },
            });

            if (existingItem) {
                return this.HandleError(
                    new BadRequestException('This reflection session is already in the vision board'),
                );
            }

            reflectionSession = foundSession;
        }

        let imageUrl: string | undefined;
        if (imageFile) {
            try {
                const uploadResult = await this.storageService.uploadFile(
                    imageFile,
                    FileType.IMAGE,
                    user.id,
                    'vision-board/images',
                );
                imageUrl = uploadResult.url;
            } catch (error) {
                return this.HandleError(
                    new BadRequestException(`Failed to upload image: ${error.message}`),
                );
            }
        }

        const maxOrderItem = await this.prisma.vision.findFirst({
            where: { userId: user.id },
            orderBy: { order: 'desc' },
        });

        const order = maxOrderItem ? (maxOrderItem.order || 0) + 1 : 1;

        // Create vision
        const createData: any = {
            userId: user.id,
            order,
        };
        if (reflectionSessionId) {
            createData.reflectionSessionId = reflectionSessionId;
        }
        if (imageUrl) {
            createData.imageUrl = imageUrl;
        }

        const visionItem = await this.prisma.vision.create({
            data: createData,
            include: {
                reflectionSession: reflectionSessionId ? {
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                } : false,
            },
        });

        // Format response
        const response: any = {
            id: visionItem.id,
            reflectionSessionId: visionItem.reflectionSessionId,
            imageUrl: visionItem.imageUrl,
            order: visionItem.order,
            createdAt: visionItem.createdAt,
            updatedAt: visionItem.updatedAt,
        };

        if (reflectionSession && visionItem.reflectionSession) {
            response.affirmation = reflectionSession.approvedAffirmation || reflectionSession.generatedAffirmation;
            response.reflectionSession = {
                id: reflectionSession.id,
                prompt: reflectionSession.prompt,
                category: reflectionSession.category,
            };
        } else {
            response.affirmation = null;
            response.reflectionSession = null;
        }

        return this.Results(response);
    }

    /**
     * Get all visions for user's vision board (paginated)
     */
    async getAllVisions(firebaseId: string, page: number = 1, limit: number = 10) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.max(1, Math.min(100, Math.floor(limit)));
        const skip = (pageNumber - 1) * pageSize;

        const totalCount = await this.prisma.vision.count({
            where: { userId: user.id },
        });

        const items = await this.prisma.vision.findMany({
            where: { userId: user.id },
            orderBy: { order: 'asc' },
            skip,
            take: pageSize,
            include: {
                reflectionSession: {
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        const totalPages = Math.ceil(totalCount / pageSize);

        // Format response
        const data = items.map((item) => {
            const response: any = {
                id: item.id,
                reflectionSessionId: item.reflectionSessionId,
                imageUrl: item.imageUrl,
                order: item.order,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            };

            if (item.reflectionSession) {
                response.affirmation = item.reflectionSession.approvedAffirmation || item.reflectionSession.generatedAffirmation;
                response.reflectionSession = {
                    id: item.reflectionSession.id,
                    prompt: item.reflectionSession.prompt,
                    category: item.reflectionSession.category,
                };
            } else {
                response.affirmation = null;
                response.reflectionSession = null;
            }

            return response;
        });

        return this.Results({
            data,
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total: totalCount,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPreviousPage: pageNumber > 1,
            },
        });
    }

    /**
     * Get single vision by ID
     */
    async getVisionById(firebaseId: string, visionId: string) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        const visionItem = await this.prisma.vision.findFirst({
            where: {
                id: visionId,
                userId: user.id,
            },
            include: {
                reflectionSession: {
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!visionItem) {
            return this.HandleError(new NotFoundException('Vision not found'));
        }

        // Format response
        const response: any = {
            id: visionItem.id,
            reflectionSessionId: visionItem.reflectionSessionId,
            imageUrl: visionItem.imageUrl,
            order: visionItem.order,
            createdAt: visionItem.createdAt,
            updatedAt: visionItem.updatedAt,
        };

        if (visionItem.reflectionSession) {
            response.affirmation = visionItem.reflectionSession.approvedAffirmation || visionItem.reflectionSession.generatedAffirmation;
            response.reflectionSession = {
                id: visionItem.reflectionSession.id,
                prompt: visionItem.reflectionSession.prompt,
                category: visionItem.reflectionSession.category,
            };
        } else {
            response.affirmation = null;
            response.reflectionSession = null;
        }

        return this.Results(response);
    }

    /**
     * Update a vision (image and/or reflection session)
     */
    async updateVision(
        firebaseId: string,
        visionId: string,
        reflectionSessionId?: string,
        imageFile?: Express.Multer.File,
    ) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        // Validate that at least one parameter is provided
        if (!reflectionSessionId && !imageFile) {
            return this.HandleError(
                new BadRequestException('Either reflectionSessionId or imageFile must be provided'),
            );
        }

        const visionItem = await this.prisma.vision.findFirst({
            where: {
                id: visionId,
                userId: user.id,
            },
            include: {
                reflectionSession: {
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!visionItem) {
            return this.HandleError(new NotFoundException('Vision not found'));
        }

        if (reflectionSessionId) {
            const foundSession = await this.prisma.reflectionSession.findFirst({
                where: {
                    id: reflectionSessionId,
                    userId: user.id,
                },
            });

            if (!foundSession) {
                return this.HandleError(new NotFoundException('Reflection session not found'));
            }

            if (foundSession.status !== ReflectionSessionStatus.AFFIRMATION_GENERATED) {
                return this.HandleError(
                    new BadRequestException('Reflection session must be in AFFIRMATION_GENERATED status to link to vision board'),
                );
            }

            // Check if already linked to another vision
            const existingItem = await this.prisma.vision.findUnique({
                where: { reflectionSessionId },
            });

            if (existingItem && existingItem.id !== visionId) {
                return this.HandleError(
                    new BadRequestException('This reflection session is already linked to another vision'),
                );
            }
        }

        // Upload new image if provided
        let imageUrl: string | undefined;
        if (imageFile) {
            try {
                const uploadResult = await this.storageService.uploadFile(
                    imageFile,
                    FileType.IMAGE,
                    user.id,
                    'vision-board/images',
                );
                imageUrl = uploadResult.url;
            } catch (error) {
                return this.HandleError(
                    new BadRequestException(`Failed to upload image: ${error.message}`),
                );
            }
        }

        // Prepare update data
        const updateData: any = {};
        if (imageUrl !== undefined) {
            updateData.imageUrl = imageUrl;
        }
        if (reflectionSessionId !== undefined) {
            updateData.reflectionSessionId = reflectionSessionId;
        }

        // Update vision
        const updatedItem = await this.prisma.vision.update({
            where: { id: visionId },
            data: updateData,
            include: {
                reflectionSession: {
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        // Format response
        const response: any = {
            id: updatedItem.id,
            reflectionSessionId: updatedItem.reflectionSessionId,
            imageUrl: updatedItem.imageUrl,
            order: updatedItem.order,
            createdAt: updatedItem.createdAt,
            updatedAt: updatedItem.updatedAt,
        };

        if (updatedItem.reflectionSession) {
            response.affirmation = updatedItem.reflectionSession.approvedAffirmation || updatedItem.reflectionSession.generatedAffirmation;
            response.reflectionSession = {
                id: updatedItem.reflectionSession.id,
                prompt: updatedItem.reflectionSession.prompt,
                category: updatedItem.reflectionSession.category,
            };
        } else {
            response.affirmation = null;
            response.reflectionSession = null;
        }

        return this.Results(response);
    }

    /**
     * Remove vision from board
     */
    async removeVision(firebaseId: string, visionId: string) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        const visionItem = await this.prisma.vision.findFirst({
            where: {
                id: visionId,
                userId: user.id,
            },
        });

        if (!visionItem) {
            return this.HandleError(new NotFoundException('Vision not found'));
        }

        await this.prisma.vision.delete({
            where: { id: visionId },
        });

        return this.Results({ message: 'Vision removed successfully' });
    }
    
    async uploadVisionSound(firebaseId: string, soundFiles: Express.Multer.File[]) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        if (!soundFiles || soundFiles.length === 0) {
            return this.HandleError(new BadRequestException('At least one audio file is required'));
        }

        // Get the current max order for this user's sound files
        const maxOrderFile = await this.prisma.visionBoardSound.findFirst({
            orderBy: { order: 'desc' },
        });

        let currentOrder = maxOrderFile ? (maxOrderFile.order || 0) : 0;

        const uploadedFiles: Array<{
            id: string;
            soundUrl: string;
            fileName: string | null;
            fileSize: number | null;
            mimeType: string | null;
            order: number | null;
            createdAt: Date;
            updatedAt: Date;
        }> = [];

        // Upload each file and save to database
        for (const soundFile of soundFiles) {
            try {
                // Upload file to storage
                const uploadResult = await this.storageService.uploadFile(
                    soundFile,
                    FileType.AUDIO,
                    user.id,
                    'vision-board/sounds',
                );

                currentOrder += 1;

                // Save file record to database
                const soundFileRecord = await this.prisma.visionBoardSound.create({
                    data: {
                        soundUrl: uploadResult.url,
                        fileName: soundFile.originalname,
                        fileSize: soundFile.size,
                        mimeType: soundFile.mimetype,
                        order: currentOrder,
                    },
                });

                uploadedFiles.push({
                    id: soundFileRecord.id,
                    soundUrl: soundFileRecord.soundUrl,
                    fileName: soundFileRecord.fileName,
                    fileSize: soundFileRecord.fileSize,
                    mimeType: soundFileRecord.mimeType,
                    order: soundFileRecord.order,
                    createdAt: soundFileRecord.createdAt,
                    updatedAt: soundFileRecord.updatedAt,
                });
            } catch (error) {
                this.logger.error(`Failed to upload sound file ${soundFile.originalname}: ${error.message}`);
                // Continue with other files even if one fails
                // You might want to handle this differently based on requirements
            }
        }

        if (uploadedFiles.length === 0) {
            return this.HandleError(
                new BadRequestException('Failed to upload any audio files'),
            );
        }

        return this.Results({
            uploaded: uploadedFiles.length,
            files: uploadedFiles,
        });
    }

    async getVisionSounds(firebaseId: string) {
        const user = await this.getUserByFirebaseId(firebaseId);
        if (!user) {
            return this.HandleError(new NotFoundException('User not found'));
        }

        const soundFiles = await this.prisma.visionBoardSound.findMany({
            orderBy: { order: 'asc' },
        });

        const files = soundFiles.map((file) => ({
            id: file.id,
            soundUrl: file.soundUrl,
            fileName: file.fileName,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
            order: file.order,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
        }));

        return this.Results({
            count: files.length,
            files,
        });
    }

    private async getUserByFirebaseId(firebaseId: string) {
        return this.prisma.user.findUnique({
            where: { firebaseId },
        });
    }
}