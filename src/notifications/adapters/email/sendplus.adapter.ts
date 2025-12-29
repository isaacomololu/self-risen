import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailChannelAdapter } from '../../interfaces/adapter.interface';
import {
  NotificationChannelRequest,
  NotificationChannelResponse,
} from '../../interfaces/adapter.interface';
import { NotificationStatusEnum } from '../../enums/notification.enum';

@Injectable()
export class SendplusAdapter extends IEmailChannelAdapter {
  readonly name = 'Sendplus';
  private apiKey: string;
  private apiUrl: string;

  constructor(private configService: ConfigService) {
    super();
    this.apiKey = this.configService.get<string>('SENDPLUS_API_KEY') || '';
    this.apiUrl = this.configService.get<string>('SENDPLUS_API_URL') || 'https://api.sendplus.com';
  }

  async send(
    request: NotificationChannelRequest,
  ): Promise<NotificationChannelResponse> {
    try {
      const apiKey = this.configService.get<string>('SENDPLUS_API_KEY');
      const apiUrl = this.configService.get<string>('SENDPLUS_API_URL') || 'https://api.sendplus.com';
      const fromEmail = this.configService.get<string>('SENDPLUS_FROM_EMAIL');

      if (!apiKey) {
        return {
          status: NotificationStatusEnum.FAILED,
          error: 'Sendplus configuration missing: SENDPLUS_API_KEY',
        };
      }

      if (!fromEmail) {
        return {
          status: NotificationStatusEnum.FAILED,
          error: 'Sendplus configuration missing: SENDPLUS_FROM_EMAIL',
        };
      }

      // Update instance variables if config changed
      this.apiKey = apiKey;
      this.apiUrl = apiUrl;

      const messageData = {
        from: fromEmail,
        to: request.recipient,
        subject: request.title,
        text: request.body,
        html: request.htmlBody || request.body,
      };

      // Add timeout wrapper to prevent indefinite hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(`${apiUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(messageData),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            status: NotificationStatusEnum.FAILED,
            error: `Sendplus API error: ${errorData.message || response.statusText} (${response.status})`,
          };
        }

        const result = await response.json();

        return {
          status: NotificationStatusEnum.SENT,
          messageId: result.id || result.messageId || result.message_id,
        };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          return {
            status: NotificationStatusEnum.FAILED,
            error: 'Email send timeout: Operation exceeded 30 seconds',
          };
        }

        throw fetchError;
      }
    } catch (error: any) {
      // Log the actual error for debugging
      console.error('[SendplusAdapter] Send error:', {
        message: error?.message,
        stack: error?.stack,
      });

      // Handle network errors
      if (
        error?.message?.includes('timeout') ||
        error?.message?.includes('ECONNREFUSED') ||
        error?.message?.includes('ENOTFOUND') ||
        error?.message?.includes('fetch failed')
      ) {
        return {
          status: NotificationStatusEnum.FAILED,
          error: `Email send failed due to network error. Check network connectivity and Sendplus API endpoint. Original error: ${error?.message || String(error)}`,
        };
      }

      // Handle authentication errors
      if (
        error?.message?.includes('401') ||
        error?.message?.includes('unauthorized') ||
        error?.message?.includes('authentication')
      ) {
        return {
          status: NotificationStatusEnum.FAILED,
          error: `Sendplus authentication failed. Please verify your API key is correct. Error: ${error?.message || String(error)}`,
        };
      }

      return {
        status: NotificationStatusEnum.FAILED,
        error: error?.message || String(error) || 'Unknown error',
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const apiKey = this.configService.get<string>('SENDPLUS_API_KEY');
      const fromEmail = this.configService.get<string>('SENDPLUS_FROM_EMAIL');
      return !!(apiKey && fromEmail);
    } catch {
      return false;
    }
  }
}

