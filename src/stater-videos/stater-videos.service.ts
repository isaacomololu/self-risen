import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseService } from 'src/common';
import { DatabaseProvider } from 'src/database/database.provider';



@Injectable()
export class StaterVideosService extends BaseService {
    constructor(private prisma: DatabaseProvider) {
        super();
    }

    async getFileUrls() {
        const light = [
            // {
            //     url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/public/uploads/videos/starters/t7D57nFbnSPlFRuZw4uZqIuJL2Y2/60fda64b-d84a-4b8f-b160-2cf95ef1fa3b-1768767978757.mp4',
            //     name: 'bright-glow'
            // },
            {
                url: 'https://satyfurcysfjxwfhcizv.supabase.co/storage/v1/object/public/uploads/videos/starters/OrUQsjFHWOdTMmDzuD71Fl6AVgA3/832d2098-11fe-40d6-a514-f25eb36a5c31-1775146711989.mp4',
                name: 'golden-waves'
            },
            {
                url: 'https://satyfurcysfjxwfhcizv.supabase.co/storage/v1/object/public/uploads/videos/starters/OrUQsjFHWOdTMmDzuD71Fl6AVgA3/e7c06a04-7426-4d61-a0eb-3ee6e728cdfa-1775147474510.mp4',
                name: 'golden-sun'
            },
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/public/uploads/videos/starters/t7D57nFbnSPlFRuZw4uZqIuJL2Y2/78a8efd8-a10c-4b48-a309-832b46ffa034-1768768252248.mp4',
                name: 'ocean-view'
            },
            // {
            //     url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/public/uploads/videos/starters/t7D57nFbnSPlFRuZw4uZqIuJL2Y2/a8efb95b-b8d8-4372-bf2e-732cccb343b6-1768768401303.mp4',
            //     name: 'sun'
            // }
        ];

        const dark = [
            {
                url: 'https://satyfurcysfjxwfhcizv.supabase.co/storage/v1/object/public/uploads/videos/starters/OrUQsjFHWOdTMmDzuD71Fl6AVgA3/b65073de-3d15-4db7-b5d4-4e15a884c238-1775150837039.mp4',
                name: 'Axis'
            },
            {
                url: 'https://satyfurcysfjxwfhcizv.supabase.co/storage/v1/object/public/uploads/videos/starters/OrUQsjFHWOdTMmDzuD71Fl6AVgA3/0d9876c0-69a2-462b-a9f5-ecb257d16359-1775147923266.mp4',
                name: 'mystic-forest'
            },
            {
                url: 'https://satyfurcysfjxwfhcizv.supabase.co/storage/v1/object/public/uploads/videos/starters/OrUQsjFHWOdTMmDzuD71Fl6AVgA3/912eba84-76e0-4cf8-b805-fb6999cb48a2-1775146277440.mp4',
                name: 'high-sea'
            },
            {
                url: 'https://satyfurcysfjxwfhcizv.supabase.co/storage/v1/object/public/uploads/videos/starters/OrUQsjFHWOdTMmDzuD71Fl6AVgA3/123e3b0c-ebe6-4997-b77b-ffe7ac44fce7-1775147688657.mp4',
                name: 'ice'
            },
            {
                url: 'https://satyfurcysfjxwfhcizv.supabase.co/storage/v1/object/public/uploads/videos/starters/OrUQsjFHWOdTMmDzuD71Fl6AVgA3/bf8317cd-a8a2-40d7-a402-7a1d4ef67138-1775146979127.mp4',
                name: 'space-odyssey'
            }
        ];

        return this.Results({ light, dark });
    }

    private getSoundList(): Array<{ url: string; name: string }> {
        return [
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/sign/uploads/audios/background/HtmDdP4E5EO1vZwujDIg2Xvz3tF2/a43c3898-d301-4e30-9df5-f7c07db5126c-1772198989463.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMmE2ZWM2Zi1iZDNjLTRmY2YtYTVmYS1hNjVhZDVmM2E4ODEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1cGxvYWRzL2F1ZGlvcy9iYWNrZ3JvdW5kL0h0bURkUDRFNUVPMXZad3VqRElnMlh2ejN0RjIvYTQzYzM4OTgtZDMwMS00ZTMwLTlkZjUtZjdjMDdkYjUxMjZjLTE3NzIxOTg5ODk0NjMubXAzIiwiaWF0IjoxNzcyMTk4OTkxLCJleHAiOjE4MDM3MzQ5OTF9.AQHRTzymskO7A_ouB1RLC7BHB20b8iYZsYFz2oXfpaA',
                name: 'meditation',
            },
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/sign/uploads/audios/background/HtmDdP4E5EO1vZwujDIg2Xvz3tF2/a76c3e12-80fe-4ade-afee-96c16fd21401-1772201360383.wav?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMmE2ZWM2Zi1iZDNjLTRmY2YtYTVmYS1hNjVhZDVmM2E4ODEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1cGxvYWRzL2F1ZGlvcy9iYWNrZ3JvdW5kL0h0bURkUDRFNUVPMXZad3VqRElnMlh2ejN0RjIvYTc2YzNlMTItODBmZS00YWRlLWFmZWUtOTZjMTZmZDIxNDAxLTE3NzIyMDEzNjAzODMud2F2IiwiaWF0IjoxNzcyMjAxMzYyLCJleHAiOjE4MDM3MzczNjJ9.bg9JGqWmRV6hmUBzJtaJEhN1pWj0j8ZCgqOGhvuv-Hk',
                name: 'Ambient Uplifting',
            },
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/sign/uploads/audios/background/HtmDdP4E5EO1vZwujDIg2Xvz3tF2/fa859cf2-6559-438c-a468-33167092292f-1772202129997.wav?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMmE2ZWM2Zi1iZDNjLTRmY2YtYTVmYS1hNjVhZDVmM2E4ODEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1cGxvYWRzL2F1ZGlvcy9iYWNrZ3JvdW5kL0h0bURkUDRFNUVPMXZad3VqRElnMlh2ejN0RjIvZmE4NTljZjItNjU1OS00MzhjLWE0NjgtMzMxNjcwOTIyOTJmLTE3NzIyMDIxMjk5OTcud2F2IiwiaWF0IjoxNzcyMjAyMTMzLCJleHAiOjE4MDM3MzgxMzN9.oQBsJqa2KzFpiSUj7UIcJXve8IN4epQ7b_ZXJTLVwnY',
                name: 'Inspiring Dreamy Happy Adventure Pop',
            },
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/sign/uploads/audios/background/od5qaWAnXdfHIgLuGC8qxaqRLrm1/72b72865-73d7-49e6-801e-c3718abb3595-1772202713152.wav?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMmE2ZWM2Zi1iZDNjLTRmY2YtYTVmYS1hNjVhZDVmM2E4ODEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1cGxvYWRzL2F1ZGlvcy9iYWNrZ3JvdW5kL29kNXFhV0FuWGRmSElnTHVHQzhxeGFxUkxybTEvNzJiNzI4NjUtNzNkNy00OWU2LTgwMWUtYzM3MThhYmIzNTk1LTE3NzIyMDI3MTMxNTIud2F2IiwiaWF0IjoxNzcyMjAyODg4LCJleHAiOjE4MDM3Mzg4ODh9.yX5iw9cjvOt3ZgWdtEawLlM7BeeL45o525njKkJ3lEE',
                name: 'Ambient Piano',
            },
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/sign/uploads/audios/background/od5qaWAnXdfHIgLuGC8qxaqRLrm1/c794dbb4-c355-4c54-9e54-03395086176d-1772203004848.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMmE2ZWM2Zi1iZDNjLTRmY2YtYTVmYS1hNjVhZDVmM2E4ODEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1cGxvYWRzL2F1ZGlvcy9iYWNrZ3JvdW5kL29kNXFhV0FuWGRmSElnTHVHQzhxeGFxUkxybTEvYzc5NGRiYjQtYzM1NS00YzU0LTllNTQtMDMzOTUwODYxNzZkLTE3NzIyMDMwMDQ4NDgubXAzIiwiaWF0IjoxNzcyMjAzMTUxLCJleHAiOjE4MDM3MzkxNTF9.u98TcRHq8BN5McBHpi-Jo1EAKUXnOQXMTmnM15IERl0',
                name: 'main track',
            },
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/sign/uploads/audios/background/od5qaWAnXdfHIgLuGC8qxaqRLrm1/61a454a5-7121-43b0-852c-b5d0660c09dd-1772203329482.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMmE2ZWM2Zi1iZDNjLTRmY2YtYTVmYS1hNjVhZDVmM2E4ODEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1cGxvYWRzL2F1ZGlvcy9iYWNrZ3JvdW5kL29kNXFhV0FuWGRmSElnTHVHQzhxeGFxUkxybTEvNjFhNDU0YTUtNzEyMS00M2IwLTg1MmMtYjVkMDY2MGMwOWRkLTE3NzIyMDMzMjk0ODIubXAzIiwiaWF0IjoxNzcyMjAzNDkxLCJleHAiOjE4MDM3Mzk0OTF9.K3bBbLTrgz_7eCvzRPpxxcxIBve7Ca8A2QXcr03GGNI',
                name: 'Theta Meditation',
            },
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/sign/uploads/audios/background/od5qaWAnXdfHIgLuGC8qxaqRLrm1/308e98ba-fba5-4139-9ae3-e3249b50f04b-1772203838226.wav?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMmE2ZWM2Zi1iZDNjLTRmY2YtYTVmYS1hNjVhZDVmM2E4ODEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1cGxvYWRzL2F1ZGlvcy9iYWNrZ3JvdW5kL29kNXFhV0FuWGRmSElnTHVHQzhxeGFxUkxybTEvMzA4ZTk4YmEtZmJhNS00MTM5LTlhZTMtZTMyNDliNTBmMDRiLTE3NzIyMDM4MzgyMjYud2F2IiwiaWF0IjoxNzcyMjA0MDQzLCJleHAiOjE4MDM3NDAwNDN9.5lJzmF8cM2Dv3hmjGnUyhb_dlMaQ-yl1fdkEcL6367Y',
                name: 'Tribal Ceremony',
            },
            {
                url: 'https://lstprxumviehmvbebcub.supabase.co/storage/v1/object/sign/uploads/audios/background/od5qaWAnXdfHIgLuGC8qxaqRLrm1/ea5832f6-9002-44b0-a1d7-b3719166e772-1772204203405.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMmE2ZWM2Zi1iZDNjLTRmY2YtYTVmYS1hNjVhZDVmM2E4ODEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1cGxvYWRzL2F1ZGlvcy9iYWNrZ3JvdW5kL29kNXFhV0FuWGRmSElnTHVHQzhxeGFxUkxybTEvZWE1ODMyZjYtOTAwMi00NGIwLWExZDctYjM3MTkxNjZlNzcyLTE3NzIyMDQyMDM0MDUubXAzIiwiaWF0IjoxNzcyMjA0MjM3LCJleHAiOjE4MDM3NDAyMzd9.8UvM3OWmOPDgPcWjp3kx0hoHtk3KNAtdM6MHNJuQCz0',
                name: 'Cinematic Piano',
            },
        ];
    }

    async getMusicUrls() {
        return this.Results(this.getSoundList());
    }

    /**
     * Returns the music entry for the given name, or null if not found.
     */
    getSoundByName(name: string): { url: string; name: string } | null {
        const list = this.getSoundList();
        return list.find((item) => item.name === name) ?? null;
    }

    // async getAllSessions(
    //     page: number = 1,
    //     limit: number = 10,
    // ) {
    //     const pageNumber = Math.max(1, Math.floor(page));
    //     const pageSize = Math.max(1, Math.min(100, Math.floor(limit)));
    //     const skip = (pageNumber - 1) * pageSize;

    //     const whereClause = { userId: '51c20a08-c95e-4673-854a-8ed327997681' };

    //     const totalCount = await this.prisma.reflectionSession.count({
    //         where: whereClause,
    //     });

    //     const sessions = await this.prisma.reflectionSession.findMany({
    //         where: whereClause,
    //         orderBy: { createdAt: 'desc' },
    //         skip,
    //         take: pageSize,
    //         include: {
    //             category: {
    //                 select: {
    //                     id: true,
    //                     name: true,
    //                 },
    //             },
    //         },
    //     });

    //     const totalPages = Math.ceil(totalCount / pageSize);

    //     return this.Results({
    //         data: sessions,
    //         pagination: {
    //             page: pageNumber,
    //             limit: pageSize,
    //             total: totalCount,
    //             totalPages,
    //             hasNextPage: pageNumber < totalPages,
    //             hasPreviousPage: pageNumber > 1,
    //         },
    //     });
    // }

    // private async getUserByFirebaseId(firebaseId: string) {
    //     return this.prisma.user.findUnique({
    //         where: { firebaseId },
    //     });
    // }
}
