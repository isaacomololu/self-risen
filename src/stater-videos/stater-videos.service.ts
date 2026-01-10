import { Injectable, NotFoundException} from '@nestjs/common';
import { BaseService } from 'src/common';
import { DatabaseProvider } from 'src/database/database.provider';



@Injectable()
export class StaterVideosService extends BaseService{
        constructor(private prisma: DatabaseProvider) {
        super();
    }

    async getFileUrls() {
        const light = [
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/public/uploads/Starters/shutterstock_3576412067.mov',
                name: 'bright-glow'
            },
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/public/uploads/Starters/shutterstock_3783464351.mov',
                name: 'golden-waves'
            },
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/public/uploads/Starters/shutterstock_1058137462.mov',
                name: 'golden-sun'
            },
            {
                url: 'https://kbvhivwhxphzvfxczguu.supabase.co/storage/v1/object/public/User/Videos/starts/shutterstock_3576412067.mov',
                name: 'ocean-view'
            },
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/public/uploads/Starters/shutterstock_3524719331%20(1).mov',
                name: 'sun'
            },
        ];

        const dark = [
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/public/uploads/Starters/shutterstock_3615002785.mov',
                name: 'neon'
            },
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/public/uploads/Starters/shutterstock_3578500407%20(1).mov',
                name: 'mystic-forest'
            },
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/public/uploads/Starters/shutterstock_3499135879%20(1).mov',
                name: 'high-sea'
            },
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/public/uploads/Starters/shutterstock_3681838307.mp4',
                name: 'space-odyssey'
            }
        ];

        return this.Results({ light, dark });
    }

    async getAllSessions(
        page: number = 1,
        limit: number = 10,
    ) {
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.max(1, Math.min(100, Math.floor(limit)));
        const skip = (pageNumber - 1) * pageSize;

        const whereClause = { userId: '51c20a08-c95e-4673-854a-8ed327997681' };

        const totalCount = await this.prisma.reflectionSession.count({
            where: whereClause,
        });

        const sessions = await this.prisma.reflectionSession.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        const totalPages = Math.ceil(totalCount / pageSize);

        return this.Results({
            data: sessions,
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

    private async getUserByFirebaseId(firebaseId: string) {
        return this.prisma.user.findUnique({
            where: { firebaseId },
        });
    }
}
