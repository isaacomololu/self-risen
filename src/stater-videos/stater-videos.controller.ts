import { Controller, Get, Query } from '@nestjs/common';
import { BaseController, FirebaseUser } from 'src/common';
import { StaterVideosService } from './stater-videos.service';
import { auth } from 'firebase-admin';

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

    // @Get('sessions')
    // async getAllSessions(
    //     @Query('page') page?: string,
    //     @Query('limit') limit?: string,
    // ) {
    //     const pageNumber = page ? parseInt(page, 10) : 1;
    //     const limitNumber = limit ? parseInt(limit, 10) : 10;

    //         const result = await this.staterVideosService.getAllSessions(
    //         pageNumber,
    //         limitNumber,
    //     );
    //     if (result.isError) throw result.error;

    //     return this.response({
    //         message: 'Reflection sessions retrieved',
    //         data: result.data,
    //     });
    // }
}
