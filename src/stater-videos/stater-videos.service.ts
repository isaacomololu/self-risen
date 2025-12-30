import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common';

@Injectable()
export class StaterVideosService extends BaseService{
    constructor() {
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
}
