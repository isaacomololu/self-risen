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
                url: 'https://kbvhivwhxphzvfxczguu.supabase.co/storage/v1/object/public/User/Videos/starts/shutterstock_3576412067.mov',
                name: 'ocean-view'
            },
        ];

        const dark = [
            {
                url: 'https://kbvhivwhxphzvfxczguu.supabase.co/storage/v1/object/public/User/Videos/starts/shutterstock_3576412067.mov',
                name: 'ocean-view'
            }
        ];

        return this.Results({ light, dark });
    }
}
