import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { DatabaseProvider } from 'src/database/database.provider';
import { NotificationQueueService } from './services/notification-queue.service';
import { TemplateService } from './services/template.service';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { DeadLetterQueueRepository } from './repositories/dead-letter-queue.repository';
import { MailgunAdapter } from './adapters/email/mailgun.adapter';
import { TwilioAdapter } from './adapters/sms/twilio.adapter';
import { FirebaseAdapter } from './adapters/push/firebase.adapter';
import { INotificationService } from './interfaces/notification.interface';
import { NotificationChannelTypeEnum } from './enums/notification.enum';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'notification_dispatch',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    CacheModule.register(),
  ],
  controllers: [NotificationsController],
  providers: [
    // Services
    {
      provide: INotificationService,
      useClass: NotificationsService,
    },
    NotificationsService,
    NotificationQueueService,
    TemplateService,
    AuditLogRepository,
    DeadLetterQueueRepository,
    DatabaseProvider,

    // Adapters
    MailgunAdapter,
    TwilioAdapter,
    FirebaseAdapter,

    // Adapter Registry
    {
      provide: 'NOTIFICATION_CHANNEL_ADAPTERS',
      useFactory: (
        mailgun: MailgunAdapter,
        twilio: TwilioAdapter,
        firebase: FirebaseAdapter,
      ) => {
        const map = new Map();
        map.set(NotificationChannelTypeEnum.EMAIL, [mailgun]);
        map.set(NotificationChannelTypeEnum.SMS, [twilio]);
        map.set(NotificationChannelTypeEnum.PUSH, [firebase]);
        return map;
      },
      inject: [MailgunAdapter, TwilioAdapter, FirebaseAdapter],
    },
  ],
  exports: [INotificationService, NotificationsService],
})
export class NotificationsModule { }
