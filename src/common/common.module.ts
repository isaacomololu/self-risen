import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { StreakService } from './services/streak.service';
import { StreakInterceptor } from './interceptors/streak.interceptor';

@Module({
    imports: [DatabaseModule],
    providers: [StreakService, StreakInterceptor],
    exports: [StreakService, StreakInterceptor],
})
export class CommonModule { }