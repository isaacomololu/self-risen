import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ConfigValidationRule {
  key: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
}

@Injectable()
export class ConfigValidatorService implements OnModuleInit {
  private readonly logger = new Logger(ConfigValidatorService.name);

  // Define required config keys and their validation rules
  private readonly configRules: ConfigValidationRule[] = [
    // Redis (required for Bull queue)
    {
      key: 'REDIS_HOST',
      required: true,
      description: 'Redis host for notification queue',
    },
    {
      key: 'REDIS_PORT',
      required: true,
      description: 'Redis port for notification queue',
      validator: (value) => !isNaN(Number(value)) && Number(value) > 0,
    },

    // Mailgun (optional but warn if missing)
    {
      key: 'MAILGUN_API_KEY',
      required: false,
      description: 'Mailgun API key for email notifications',
    },
    {
      key: 'MAILGUN_DOMAIN',
      required: false,
      description: 'Mailgun domain for email notifications',
    },
    {
      key: 'MAILGUN_FROM_EMAIL',
      required: false,
      description: 'Mailgun from email address',
    },

    // Twilio (optional but warn if missing)
    {
      key: 'TWILIO_ACCOUNT_SID',
      required: false,
      description: 'Twilio account SID for SMS notifications',
    },
    {
      key: 'TWILIO_AUTH_TOKEN',
      required: false,
      description: 'Twilio auth token for SMS notifications',
    },
    {
      key: 'TWILIO_PHONE_NUMBER',
      required: false,
      description: 'Twilio phone number for SMS notifications',
    },
  ];

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('Validating notification service configuration...');

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of this.configRules) {
      const value = this.configService.get<string>(rule.key);

      if (!value || value.trim() === '') {
        if (rule.required) {
          errors.push(
            `Missing required config: ${rule.key} - ${rule.description}`,
          );
        } else {
          warnings.push(
            `Missing optional config: ${rule.key} - ${rule.description}`,
          );
        }
        continue;
      }

      // Run custom validator if provided
      if (rule.validator && !rule.validator(value)) {
        errors.push(
          `Invalid config value for ${rule.key} - ${rule.description}`,
        );
      }
    }

    // Log warnings
    if (warnings.length > 0) {
      this.logger.warn(
        'Configuration warnings (some notification channels may not work):',
      );
      warnings.forEach((warning) => this.logger.warn(`  - ${warning}`));
    }

    // Throw error if any required config is missing
    if (errors.length > 0) {
      this.logger.error('Configuration validation failed:');
      errors.forEach((error) => this.logger.error(`  - ${error}`));
      throw new Error(
        `Notification service configuration validation failed. Missing required environment variables.`,
      );
    }

    // Validate provider groups (at least one notification channel should be configured)
    const hasEmailProvider = this.hasCompleteProviderConfig([
      'MAILGUN_API_KEY',
      'MAILGUN_DOMAIN',
      'MAILGUN_FROM_EMAIL',
    ]);

    const hasSmsProvider = this.hasCompleteProviderConfig([
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_PHONE_NUMBER',
    ]);

    const availableChannels: string[] = ['IN_APP', 'PUSH']; // Always available
    if (hasEmailProvider) availableChannels.push('EMAIL');
    if (hasSmsProvider) availableChannels.push('SMS');

    this.logger.log(
      `Notification service initialized. Available channels: ${availableChannels.join(', ')}`,
    );

    if (!hasEmailProvider) {
      this.logger.warn(
        'EMAIL channel is not available. Configure MAILGUN_* variables to enable.',
      );
    }

    if (!hasSmsProvider) {
      this.logger.warn(
        'SMS channel is not available. Configure TWILIO_* variables to enable.',
      );
    }
  }

  private hasCompleteProviderConfig(keys: string[]): boolean {
    return keys.every((key) => {
      const value = this.configService.get<string>(key);
      return value && value.trim() !== '';
    });
  }

  /**
   * Get health status of all notification providers
   */
  getProvidersHealth(): Record<string, boolean> {
    return {
      email: this.hasCompleteProviderConfig([
        'MAILGUN_API_KEY',
        'MAILGUN_DOMAIN',
        'MAILGUN_FROM_EMAIL',
      ]),
      sms: this.hasCompleteProviderConfig([
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_PHONE_NUMBER',
      ]),
      push: true, // Firebase is configured elsewhere
      inApp: true, // Always available
    };
  }
}
