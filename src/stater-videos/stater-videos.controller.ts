import { Controller, Get } from '@nestjs/common';
import { BaseController } from 'src/common';
import { StaterVideosService } from './stater-videos.service';

@Controller('stater-videos')
export class StaterVideosController extends BaseController {
    constructor(private readonly staterVideosService: StaterVideosService) {
        super();
    }

    @Get('files')
    async getFileUrls() {
        const result = await this.staterVideosService.getFileUrls();
        if (result.isError) throw result.error;

        return this.response({
            message: 'File URLs retrieved',
            data: result.data,
        });
    }
}
