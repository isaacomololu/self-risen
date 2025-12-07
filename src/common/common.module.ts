import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { StreakService } from './services/streak.service';
import { StreakInterceptor } from './interceptors/streak.interceptor';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
    imports: [DatabaseModule, NotificationsModule],
    providers: [StreakService, StreakInterceptor],
    exports: [StreakService, StreakInterceptor],
})
export class CommonModule { }