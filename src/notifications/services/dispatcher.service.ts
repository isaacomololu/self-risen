import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  NotificationStatusEnum,
  NotificationChannelTypeEnum,
} from '../enums/notification.enum';

export interface NotificationJobData {
  notificationId: string;
  userId?: string;
  channel: NotificationChannelTypeEnum;
  recipient: string;
  title: string;
  body: string;
  htmlBody?: string;
  metadata: Record<string, any>;
  requestId: string;
  provider?: string;
  notificationType: string;
}

export interface DispatchNotificationRequest {
  notificationId: string;
  userId?: string;
  channel: NotificationChannelTypeEnum;
  recipient: string;
  title: string;
  body: string;
  htmlBody?: string;
  metadata: Record<string, any>;
  requestId: string;
  provider?: string;
  notificationType: string;
}

@Injectable()
export class NotificationQueueProducer {
  constructor(
    @InjectQueue('notification_dispatch') private queue: Queue,
  ) {}

  async dispatch(request: DispatchNotificationRequest) {
    const jobData: NotificationJobData = {
      notificationId: request.notificationId,
      userId: request.userId,
      channel: request.channel,
      recipient: request.recipient,
      title: request.title,
      body: request.body,
      htmlBody: request.htmlBody,
      metadata: request.metadata,
      requestId: request.requestId,
      provider: request.provider,
      notificationType: request.notificationType,
    };

    await this.queue.add('send_notification', jobData);

    return {
      channel: {
        type: request.channel as NotificationChannelTypeEnum,
        provider: request.provider,
      },
      status: NotificationStatusEnum.QUEUED,
    };
  }
}

