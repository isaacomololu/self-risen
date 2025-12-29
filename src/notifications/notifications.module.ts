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
import { GmailAdapter } from './adapters/email/gmail.adapter';
import { TurboSMTPAdapter } from './adapters/email/turbosmtp.adapter';
import { SendplusAdapter } from './adapters/email/sendplus.adapter';
import { TwilioAdapter } from './adapters/sms/twilio.adapter';
import { FirebaseAdapter } from './adapters/push/firebase.adapter';
import { INotificationService } from './interfaces/notification.interface';
import { NotificationChannelTypeEnum } from './enums/notification.enum';
import { IEmailChannelAdapter } from './interfaces/adapter.interface';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig: any = {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        };

        // Add password if provided (required for Railway Redis)
        const password = configService.get<string>('REDIS_PASSWORD');
        if (password) {
          redisConfig.password = password;
        }

        return { redis: redisConfig };
      },
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
    GmailAdapter,
    TurboSMTPAdapter,
    SendplusAdapter,
    TwilioAdapter,
    FirebaseAdapter,

    // Adapter Registry
    {
      provide: 'NOTIFICATION_CHANNEL_ADAPTERS',
      useFactory: (
        mailgun: MailgunAdapter,
        gmail: GmailAdapter,
        turbosmtp: TurboSMTPAdapter,
        sendplus: SendplusAdapter,
        twilio: TwilioAdapter,
        firebase: FirebaseAdapter,
        configService: ConfigService,
      ) => {
        const map = new Map();

        // Email adapters priority: TurboSMTP > Gmail > Mailgun > Sendplus
        const emailAdapters: IEmailChannelAdapter[] = [];
        const hasGmailConfig =
          configService.get<string>('MAIL_USERNAME') &&
          configService.get<string>('OAUTH_CLIENTID') &&
          configService.get<string>('OAUTH_CLIENT_SECRET') &&
          configService.get<string>('OAUTH_REFRESH_TOKEN');

        const hasMailgunConfig =
          configService.get<string>('MAILGUN_API_KEY') &&
          configService.get<string>('MAILGUN_DOMAIN') &&
          configService.get<string>('MAILGUN_FROM_EMAIL');

        const hasTurboSMTPConfig =
          configService.get<number>('TURBOSMTP_PORT') &&
          configService.get<string>('TURBOSMTP_USER') &&
          configService.get<string>('TURBOSMTP_PASSWORD');

        const hasSendplusConfig =
          configService.get<string>('SENDPLUS_API_KEY') &&
          configService.get<string>('SENDPLUS_FROM_EMAIL');

        // TurboSMTP is the primary email adapter
        if (hasTurboSMTPConfig) {
          emailAdapters.push(turbosmtp);
        }
        if (hasGmailConfig) {
          emailAdapters.push(gmail);
        }
        if (hasMailgunConfig) {
          emailAdapters.push(mailgun);
        }
        if (hasSendplusConfig) {
          emailAdapters.push(sendplus);
        }

        // Default to Gmail if no adapters configured (will fail gracefully)
        if (emailAdapters.length === 0) {
          emailAdapters.push(gmail);
        }

        map.set(NotificationChannelTypeEnum.EMAIL, emailAdapters);
        map.set(NotificationChannelTypeEnum.SMS, [twilio]);
        map.set(NotificationChannelTypeEnum.PUSH, [firebase]);
        return map;
      },
      inject: [
        MailgunAdapter,
        GmailAdapter,
        TurboSMTPAdapter,
        SendplusAdapter,
        TwilioAdapter,
        FirebaseAdapter,
        ConfigService,
      ],
    },
  ],
  exports: [INotificationService, NotificationsService],
})
export class NotificationsModule { }
