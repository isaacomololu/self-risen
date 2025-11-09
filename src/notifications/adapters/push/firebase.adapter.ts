import { Injectable } from '@nestjs/common';
import { messaging } from 'firebase-admin';
import { IPushChannelAdapter } from '../../interfaces/adapter.interface';
import {
  NotificationChannelRequest,
  NotificationChannelResponse,
} from '../../interfaces/adapter.interface';
import { NotificationStatusEnum } from '../../enums/notification.enum';

@Injectable()
export class FirebaseAdapter extends IPushChannelAdapter {
  readonly name = 'Firebase';

  async send(
    request: NotificationChannelRequest,
  ): Promise<NotificationChannelResponse> {
    try {
      const message: messaging.Message = {
        notification: {
          title: request.title,
          body: request.body,
        },
        data: request.metadata || {},
        token: request.recipient, // Device token
      };

      const response = await messaging().send(message);

      return {
        status: NotificationStatusEnum.SENT,
        messageId: response,
      };
    } catch (error) {
      return {
        status: NotificationStatusEnum.FAILED,
        error: error.message || 'Unknown error',
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if Firebase is initialized by trying to access messaging
      return !!messaging();
    } catch {
      return false;
    }
  }
}

