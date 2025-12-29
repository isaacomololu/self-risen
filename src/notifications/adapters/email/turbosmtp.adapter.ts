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
export class TurboSMTPAdapter extends IEmailChannelAdapter {
  readonly name = 'TurboSMTP';
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    super();
    const host = this.configService.get<string>('TURBOSMTP_HOST') || 'pro.eu.turbo-smtp.com';
    const port = this.configService.get<number>('TURBOSMTP_PORT');
    const user = this.configService.get<string>('TURBOSMTP_USER'); // Consumer Key
    const password = this.configService.get<string>('TURBOSMTP_PASSWORD'); // Consumer Secret

    if (port && user && password) {
      // SSL ports: 465, 25025 | non-SSL ports: 25, 587, 2525
      const securePorts = [465, 25025];
      this.transporter = createTransport({
        host,
        port,
        secure: securePorts.includes(port), // SSL for ports 465 and 25025
        auth: {
          user,
          pass: password,
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
      const host = this.configService.get<string>('TURBOSMTP_HOST') || 'pro.eu.turbo-smtp.com';
      const port = this.configService.get<number>('TURBOSMTP_PORT');
      const user = this.configService.get<string>('TURBOSMTP_USER'); // Consumer Key
      const password = this.configService.get<string>('TURBOSMTP_PASSWORD'); // Consumer Secret
      const fromEmail = this.configService.get<string>('TURBOSMTP_FROM_EMAIL');

      if (!port || !user || !password) {
        return {
          status: NotificationStatusEnum.FAILED,
          error: 'TurboSMTP configuration missing: TURBOSMTP_PORT, TURBOSMTP_USER (Consumer Key), or TURBOSMTP_PASSWORD (Consumer Secret)',
        };
      }

      // Re-initialize transporter if not initialized or credentials changed
      // SSL ports: 465, 25025 | non-SSL ports: 25, 587, 2525
      const securePorts = [465, 25025];
      if (!this.transporter) {
        this.transporter = createTransport({
          host,
          port,
          secure: securePorts.includes(port), // SSL for ports 465 and 25025
          auth: {
            user,
            pass: password,
          },
          connectionTimeout: 10000,
          socketTimeout: 30000,
          greetingTimeout: 10000,
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
        });
      }

      const mailOptions = {
        from: fromEmail || user,
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
      // Log the actual error for debugging
      console.error('[TurboSMTPAdapter] Send error:', {
        code: error?.code,
        message: error?.message,
        response: error?.response,
        command: error?.command,
      });

      // Handle timeout errors
      if (
        error?.message?.includes('timeout') ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ESOCKETTIMEDOUT' ||
        error?.code === 'ECONNREFUSED' ||
        error?.code === 'ENOTFOUND'
      ) {
        return {
          status: NotificationStatusEnum.FAILED,
          error: `Email send timed out or connection failed. Check network connectivity and TurboSMTP credentials. Original error: ${error?.code || error?.message}`,
        };
      }

      // Handle authentication errors
      if (error?.code === 'EAUTH' || error?.message?.includes('authentication') || error?.message?.includes('unauthorized')) {
        return {
          status: NotificationStatusEnum.FAILED,
          error: `TurboSMTP authentication failed. Please verify your Consumer Key (TURBOSMTP_USER) and Consumer Secret (TURBOSMTP_PASSWORD) are correct. Error: ${error?.message || String(error)}`,
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
      const port = this.configService.get<number>('TURBOSMTP_PORT');
      const user = this.configService.get<string>('TURBOSMTP_USER'); // Consumer Key
      const password = this.configService.get<string>('TURBOSMTP_PASSWORD'); // Consumer Secret

      return !!(
        port &&
        user &&
        password &&
        this.transporter
      );
    } catch {
      return false;
    }
  }
}

