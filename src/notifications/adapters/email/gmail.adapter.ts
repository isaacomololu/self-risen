import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import * as nodemailer from 'nodemailer/lib/mailer';
import { IEmailChannelAdapter } from '../../interfaces/adapter.interface';
import {
  NotificationChannelRequest,
  NotificationChannelResponse,
} from '../../interfaces/adapter.interface';
import { NotificationStatusEnum } from '../../enums/notification.enum';

@Injectable()
export class GmailAdapter extends IEmailChannelAdapter {
  readonly name = 'Gmail';
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    super();
    const mailUsername = this.configService.get<string>('MAIL_USERNAME');
    const oauthClientId = this.configService.get<string>('OAUTH_CLIENTID');
    const oauthClientSecret = this.configService.get<string>('OAUTH_CLIENT_SECRET');
    const oauthRefreshToken = this.configService.get<string>('OAUTH_REFRESH_TOKEN');

    if (mailUsername && oauthClientId && oauthClientSecret && oauthRefreshToken) {
      this.transporter = createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: mailUsername,
          clientId: oauthClientId,
          clientSecret: oauthClientSecret,
          refreshToken: oauthRefreshToken,
        },
        // Timeout configurations to prevent hanging in production
        connectionTimeout: 10000, // 10 seconds to establish connection
        socketTimeout: 30000, // 30 seconds for socket operations
        greetingTimeout: 10000, // 10 seconds for SMTP greeting
        // Pool connections for better performance
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });
    }
  }

  async send(
    request: NotificationChannelRequest,
  ): Promise<NotificationChannelResponse> {
    try {
      const mailUsername = this.configService.get<string>('MAIL_USERNAME');

      if (!mailUsername) {
        return {
          status: NotificationStatusEnum.FAILED,
          error: 'Gmail configuration missing: MAIL_USERNAME',
        };
      }

      if (!this.transporter) {
        return {
          status: NotificationStatusEnum.FAILED,
          error: 'Gmail client not initialized. Check OAuth credentials.',
        };
      }

      const mailOptions = {
        from: 'Self-Risen',
        to: request.recipient,
        subject: request.title,
        html: request.htmlBody || request.body,
        text: request.body,
      };

      // Add timeout wrapper to prevent indefinite hanging
      const response = await Promise.race([
        this.transporter.sendMail(mailOptions),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error('Email send timeout: Operation exceeded 30 seconds'),
              ),
            30000,
          ),
        ),
      ]);

      return {
        status: NotificationStatusEnum.SENT,
        messageId: response.messageId,
      };
    } catch (error: any) {
      // Handle timeout errors
      if (
        error?.message?.includes('timeout') ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ESOCKETTIMEDOUT'
      ) {
        return {
          status: NotificationStatusEnum.FAILED,
          error: `Email send timed out. This may be due to network issues or Gmail service delays. Please try again later.`,
        };
      }

      // Handle OAuth authentication errors
      if (error?.code === 'EAUTH' || error?.message?.includes('invalid_grant')) {
        return {
          status: NotificationStatusEnum.FAILED,
          error: `Gmail OAuth authentication failed. Please verify your OAuth refresh token is valid and not expired. Error: ${error?.message || String(error)}`,
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
      const mailUsername = this.configService.get<string>('MAIL_USERNAME');
      const oauthClientId = this.configService.get<string>('OAUTH_CLIENTID');
      const oauthClientSecret = this.configService.get<string>(
        'OAUTH_CLIENT_SECRET',
      );
      const oauthRefreshToken = this.configService.get<string>(
        'OAUTH_REFRESH_TOKEN',
      );

      return !!(
        mailUsername &&
        oauthClientId &&
        oauthClientSecret &&
        oauthRefreshToken &&
        this.transporter
      );
    } catch {
      return false;
    }
  }
}

