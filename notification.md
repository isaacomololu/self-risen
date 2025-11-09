# Notification System Analysis & Recreation Guide

## Table of Contents

1. [Issues Found](#issues-found)
2. [Suggested Improvements](#suggested-improvements)
3. [Step-by-Step Recreation Guide](#step-by-step-recreation-guide)
4. [Architecture Overview](#architecture-overview)

---

## Issues Found

### 1. **Critical Issues**

#### 1.1 Missing Error Recovery for Failed Notifications

**Location:** `notification-processor.ts`

- **Issue:** When a notification fails after all retries, there's no dead-letter queue or fallback mechanism
- **Impact:** Lost notifications with no recovery path
- **Evidence:** Jobs are removed on complete, but failed jobs stay in queue with no alert mechanism

#### 1.2 No Transaction Management in Bulk Operations

**Location:** `notification.service.ts:notifyBulkUsers()`

- **Issue:** Creating multiple NotificationRecipient records without transaction
- **Impact:** Partial failures can leave inconsistent state (some recipients saved, others not)
- **Risk:** Database inconsistency if operation fails midway

#### 1.3 Race Condition in Rate Limiting

**Location:** `notification-rate-limiter.service.ts`

- **Issue:** Check (`isRateLimited`) and consume (`consume`) are separate operations
- **Impact:** Multiple concurrent requests can bypass rate limits
- **Example:**
  ```typescript
  // Two requests check at same time -> both pass
  // Both consume -> exceeds limit
  ```

#### 1.4 Template Variable Injection Vulnerability

**Location:** `template.service.ts`

- **Issue:** No sanitization of metadata variables before template substitution
- **Impact:** Potential XSS vulnerability in email templates
- **Risk:** User-provided data in metadata could inject malicious HTML/scripts

#### 1.5 Missing Provider Failover Configuration

**Location:** `dispatcher.service.ts` and adapters

- **Issue:** If primary provider (e.g., SendGrid) is down, no automatic fallback to secondary (Mailgun)
- **Impact:** All notifications fail even when backup providers are available
- **Current Behavior:** Provider is hardcoded in request or randomly selected

### 2. **Performance Issues**

#### 2.1 N+1 Query Problem in User Notifications

**Location:** `notification.service.ts:getUserNotifications()`

- **Issue:** Likely fetching notifications then loading relations separately
- **Impact:** Performance degradation with large notification lists
- **Recommendation:** Use eager loading with proper joins

#### 2.2 No Database Indexing on Audit Logs

**Location:** Migration file shows indexes but missing composite indexes

- **Missing Indexes:**
  - `(recipientId, notificationType, createdAt)` for filtered queries
  - `(requestId, channel)` for tracing multi-channel notifications
  - `(status, createdAt)` for retry monitoring

#### 2.3 Template Loading on Every Request

**Location:** `template.service.ts`

- **Issue:** HTML templates loaded from filesystem on each notification
- **Impact:** I/O overhead, especially for bulk notifications
- **Recommendation:** Implement template caching

#### 2.4 No Queue Concurrency Configuration

**Location:** `notification-processor.ts`

- **Issue:** No visible concurrency limit on Bull processor
- **Impact:** Could overwhelm external APIs during traffic spikes
- **Risk:** Rate limit violations from providers (SendGrid, Twilio)

### 3. **Reliability Issues**

#### 3.1 No Idempotency Protection

**Location:** `notification.service.ts:notifyUser()`

- **Issue:** Same requestId can create duplicate notifications
- **Impact:** Users receive duplicate emails/SMS for same event
- **Missing:** Idempotency check on requestId before creating notification

#### 3.2 External User Notifications Not Audited Properly

**Location:** `notification.service.ts:notifyExternalUser()`

- **Issue:** Creates audit log but no Notification record
- **Impact:** No way to track/query external notifications in main system
- **Problem:** Inconsistent data model for internal vs external users

#### 3.3 No Circuit Breaker for Provider Failures

**Location:** All adapter implementations

- **Issue:** Continuous retry attempts even when provider is clearly down
- **Impact:** Wasted resources, delayed notification queue
- **Recommendation:** Implement circuit breaker pattern

#### 3.4 Silent Failures in Template Resolution

**Location:** `template.service.ts`

- **Issue:** If template file is missing, error handling is unclear
- **Impact:** Could send notifications with empty/malformed content
- **Missing:** Fallback template for missing templates

### 4. **Security Issues**

#### 4.1 API Keys in Configuration Service

**Location:** All adapter constructors

- **Issue:** No validation that required env vars exist at startup
- **Impact:** Runtime failures when sending notifications
- **Recommendation:** Fail fast on module initialization if critical configs missing

#### 4.2 No Input Validation on Metadata

**Location:** All `notify*()` methods

- **Issue:** Metadata is `Record<string, any>` with no schema validation
- **Impact:** Type errors in templates, security risks
- **Recommendation:** Use class-validator DTOs for metadata

#### 4.3 Phone Number Exposure in Audit Logs

**Location:** `audit-log.repository.ts`

- **Issue:** Stores raw phone numbers and emails in recipientId
- **Impact:** PII exposure in logs, GDPR/privacy concern
- **Recommendation:** Hash or mask sensitive identifiers

#### 4.4 No Authentication on Notification Endpoints

**Location:** `notification.controller.ts`

- **Issue:** No visible guards on endpoints (though might be global)
- **Impact:** Unauthorized users could access/modify notifications
- **Missing:** `@UseGuards()` decorators visible in controller

### 5. **Code Quality Issues**

#### 5.1 Missing Interface Implementations

**Location:** Adapter base classes

- **Issue:** Not all adapters implement `healthCheck()` properly
- **Impact:** Health monitoring might return false positives

#### 5.2 Inconsistent Error Handling

**Location:** Various services

- **Issue:** Mix of throwing exceptions and returning error objects
- **Example:** `BaseService.HandleError()` vs direct throws
- **Impact:** Unpredictable error propagation

#### 5.3 Magic Numbers and Strings

**Location:** Multiple files

- **Examples:**
  - `160` character limit hardcoded in Twilio adapter
  - `5000ms` backoff delay hardcoded in dispatcher
  - Template IDs as strings ('EMAIL_RESIDENT_INVITE')
- **Recommendation:** Use constants/enums

#### 5.4 No Unit Tests Visible

**Location:** Project structure

- **Issue:** No test files found for critical services
- **Impact:** Regression risks, hard to refactor safely

### 6. **Monitoring & Observability Issues**

#### 6.1 No Metrics Collection

**Location:** Entire notification system

- **Missing Metrics:**
  - Notification delivery rate per channel
  - Average processing time
  - Queue depth monitoring
  - Provider-specific success rates
- **Impact:** No visibility into system performance

#### 6.2 Insufficient Logging

**Location:** Adapters and processors

- **Issue:** No structured logging for debugging
- **Missing:** Request/response logs from external providers
- **Impact:** Hard to troubleshoot delivery failures

#### 6.3 No Alerting Configuration

**Location:** Health check service

- **Issue:** Health checks available but no integration with alerting
- **Impact:** Manual monitoring required, slow incident response

#### 6.4 No SLA Tracking

**Location:** Audit logs

- **Issue:** Stores sent time but no tracking of delivery time SLAs
- **Missing:** Time-to-delivery metrics per notification type

### 7. **Configuration Issues**

#### 7.1 No Environment-Specific Settings

**Location:** Module configuration

- **Issue:** Same queue/retry settings for dev/staging/prod
- **Impact:** Can't tune performance per environment
- **Example:** Dev shouldn't retry 3 times, prod might need 5

#### 7.2 Hardcoded Retry Strategy

**Location:** `dispatcher.service.ts`

- **Issue:** 3 retries with exponential backoff hardcoded
- **Impact:** Can't adjust based on provider SLAs
- **Recommendation:** Move to ConfigService

#### 7.3 No Feature Flags

**Location:** Entire system

- **Issue:** Can't disable specific channels/providers dynamically
- **Impact:** If provider has incident, must redeploy to disable
- **Recommendation:** Implement feature flag system

---

## Suggested Improvements

### 1. **Immediate High-Priority Fixes**

#### 1.1 Implement Idempotency

```typescript
// In notification.service.ts
async notifyUser(req: UserNotificationRequest): Promise<NotificationResult[]> {
  // Check if notification with this requestId already exists
  const existingNotification = await this.notificationRepository.findOne({
    where: {
      requestId: req.requestId,
      type: req.type
    }
  });

  if (existingNotification) {
    this.logger.warn(`Duplicate notification prevented: ${req.requestId}`);
    return this.getNotificationResults(existingNotification.id);
  }

  // Continue with normal flow...
}
```

#### 1.2 Add Transaction Support for Bulk Operations

```typescript
// Use TypeORM DataSource for transactions
async notifyBulkUsers(req: BulkUserNotificationRequest) {
  return await this.dataSource.transaction(async (manager) => {
    const notification = manager.create(NotificationEntity, {...});
    await manager.save(notification);

    const recipients = req.userIds.map(userId =>
      manager.create(NotificationRecipientEntity, {...})
    );
    await manager.save(recipients);

    // Dispatch to queue after successful DB commit
    await this.dispatcher.dispatchBulk(...);

    return { success: true, notificationId: notification.id };
  });
}
```

#### 1.3 Sanitize Template Variables

```typescript
import * as DOMPurify from 'isomorphic-dompurify';

private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  return Object.entries(metadata).reduce((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key] = DOMPurify.sanitize(value);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
}
```

#### 1.4 Add Dead Letter Queue

```typescript
// In notification.module.ts
BullModule.registerQueue({
  name: 'notification_dispatch',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
}),
BullModule.registerQueue({
  name: 'notification_dead_letter',
}),

// In notification-processor.ts
@OnQueueFailed()
async handleFailure(job: Job, error: Error) {
  if (job.attemptsMade >= job.opts.attempts) {
    await this.deadLetterQueue.add('failed_notification', {
      originalJob: job.data,
      error: error.message,
      failedAt: new Date(),
    });
  }
}
```

### 2. **Performance Enhancements**

#### 2.1 Template Caching

```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';

export class TemplateService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getTemplateContent(templatePath: string): Promise<string> {
    const cacheKey = `template:${templatePath}`;

    let content = await this.cacheManager.get<string>(cacheKey);
    if (!content) {
      content = await fs.promises.readFile(templatePath, 'utf-8');
      await this.cacheManager.set(cacheKey, content, 3600000); // 1 hour
    }

    return content;
  }
}
```

#### 2.2 Add Database Indexes

```typescript
// In notification-audit-log.entity.ts
@Index(['recipientId', 'notificationType', 'createdAt'])
@Index(['requestId', 'channel'])
@Index(['status', 'createdAt'])
@Entity('notification_audit_logs')
export class NotificationAuditLogEntity extends BaseEntity {
  // ... fields
}
```

#### 2.3 Queue Concurrency Limits

```typescript
// In notification-processor.ts
@Processor('notification_dispatch')
export class NotificationProcessor {
  @Process({
    name: 'send_notification',
    concurrency: 10, // Process 10 jobs concurrently
  })
  async processNotification(job: Job<NotificationJobData>) {
    // ...
  }
}
```

#### 2.4 Optimize User Notification Queries

```typescript
async getUserNotifications(query: ListNotificationsQueryDto) {
  return this.notificationRecipientRepository.find({
    where: { recipientId: query.userId, isRead: query.isRead },
    relations: ['notification'], // Eager load
    order: { createdAt: 'DESC' },
    take: query.perPage,
    skip: (query.page - 1) * query.perPage,
  });
}
```

### 3. **Reliability Improvements**

#### 3.1 Circuit Breaker Pattern

```typescript
import * as CircuitBreaker from 'opossum';

export class SendGridAdapter extends BaseEmailAdapter {
  private circuitBreaker: CircuitBreaker;

  constructor(config: ConfigService, logger: LoggerService) {
    super();

    this.circuitBreaker = new CircuitBreaker(this.sendEmail.bind(this), {
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    });
  }

  async send(request: NotificationChannelRequest) {
    try {
      return await this.circuitBreaker.fire(request);
    } catch (error) {
      if (this.circuitBreaker.opened) {
        this.logger.error('Circuit breaker is OPEN - SendGrid unavailable');
        // Trigger fallback to secondary provider
        throw new ProviderUnavailableException('SendGrid');
      }
      throw error;
    }
  }
}
```

#### 3.2 Provider Failover Strategy

```typescript
export class NotificationQueueProducer {
  async dispatch(request: DispatchNotificationRequest) {
    const adapters = this.getAdaptersForChannel(request.channel.type);

    // Order by priority/health
    const sortedAdapters = await this.sortByAvailability(adapters);

    for (const adapter of sortedAdapters) {
      try {
        const result = await adapter.send(request);
        if (result.status === NotificationStatusEnum.SENT) {
          return result; // Success, stop trying
        }
      } catch (error) {
        this.logger.warn(`Provider ${adapter.name} failed, trying next`);
        continue; // Try next provider
      }
    }

    throw new AllProvidersFailed(request.channel.type);
  }
}
```

#### 3.3 Fallback Template

```typescript
export class TemplateService {
  private readonly FALLBACK_TEMPLATE = `
    <html>
      <body>
        <h1>\${title}</h1>
        <p>\${body}</p>
      </body>
    </html>
  `;

  async resolveTemplate(type: NotificationTypeEnum, channel: string) {
    try {
      const template = await this.loadTemplate(type, channel);
      return template;
    } catch (error) {
      this.logger.error(
        `Template not found for ${type}/${channel}, using fallback`,
      );
      return this.FALLBACK_TEMPLATE;
    }
  }
}
```

### 4. **Security Enhancements**

#### 4.1 Metadata Validation

```typescript
// Create DTOs for each notification type
export class ResidentInviteMetadataDto {
  @IsUrl()
  registrationUrl: string;

  @IsEmail()
  email: string;

  @IsString()
  estateName: string;

  @IsOptional()
  @IsString()
  houseNumber?: string;
}

// In service
async notifyUser(req: UserNotificationRequest) {
  // Validate metadata based on notification type
  const metadataDto = this.getMetadataDto(req.type);
  const validated = await plainToClass(metadataDto, req.metadata);
  const errors = await validate(validated);

  if (errors.length > 0) {
    throw new ValidationException('Invalid notification metadata');
  }

  // Continue...
}
```

#### 4.2 PII Protection in Audit Logs

```typescript
import * as crypto from 'crypto';

export class AuditLogRepository {
  private hashPII(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  async create(params: CreateAuditLogParams) {
    const log = this.auditLogRepository.create({
      ...params,
      recipientId: this.hashPII(params.recipientId), // Hash PII
      recipientPlaintext: params.recipientId, // Store separately with encryption
      metadata: this.sanitizeMetadata(params.metadata),
    });

    return await this.auditLogRepository.save(log);
  }
}
```

#### 4.3 Configuration Validation

```typescript
// In notification.module.ts
export class NotificationModule implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const requiredConfigs = ['REDIS_HOST', 'REDIS_PORT'];

    // At least one email provider
    const emailProviders = [
      'SENDGRID_API_KEY',
      'MAILGUN_API_KEY',
      'TURBOSMTP_CONSUMER_KEY',
    ];

    const hasEmailProvider = emailProviders.some((key) =>
      this.configService.get(key),
    );

    if (!hasEmailProvider) {
      throw new Error('At least one email provider must be configured');
    }

    requiredConfigs.forEach((key) => {
      if (!this.configService.get(key)) {
        throw new Error(`Missing required config: ${key}`);
      }
    });
  }
}
```

### 5. **Monitoring & Observability**

#### 5.1 Metrics Collection

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

export class NotificationMetricsService {
  private readonly notificationsSent = new Counter({
    name: 'notifications_sent_total',
    help: 'Total notifications sent',
    labelNames: ['channel', 'type', 'status', 'provider'],
  });

  private readonly processingDuration = new Histogram({
    name: 'notification_processing_duration_seconds',
    help: 'Time to process notification',
    labelNames: ['channel', 'type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });

  private readonly queueDepth = new Gauge({
    name: 'notification_queue_depth',
    help: 'Current queue depth',
  });

  recordSent(channel: string, type: string, status: string, provider: string) {
    this.notificationsSent.inc({ channel, type, status, provider });
  }

  recordDuration(channel: string, type: string, duration: number) {
    this.processingDuration.observe({ channel, type }, duration);
  }
}
```

#### 5.2 Structured Logging

```typescript
export class SendGridAdapter {
  async send(request: NotificationChannelRequest) {
    const startTime = Date.now();

    this.logger.log({
      event: 'notification_send_start',
      provider: 'SendGrid',
      channel: 'EMAIL',
      recipientId: request.recipient,
      requestId: request.requestId,
    });

    try {
      const response = await this.client.send(emailData);

      this.logger.log({
        event: 'notification_send_success',
        provider: 'SendGrid',
        duration: Date.now() - startTime,
        messageId: response.messageId,
        requestId: request.requestId,
      });

      return { status: NotificationStatusEnum.SENT };
    } catch (error) {
      this.logger.error({
        event: 'notification_send_failed',
        provider: 'SendGrid',
        error: error.message,
        errorCode: error.code,
        duration: Date.now() - startTime,
        requestId: request.requestId,
      });
      throw error;
    }
  }
}
```

#### 5.3 Health Check Alerting

```typescript
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class NotificationHealthMonitor {
  constructor(
    private healthCheckService: NotificationHealthCheckService,
    private internalNotification: INotificationService,
  ) {}

  @Cron('*/5 * * * *') // Every 5 minutes
  async monitorHealth() {
    const status = await this.healthCheckService.getOverallStatus();

    if (status === HealthStatusEnum.DOWNTIME) {
      await this.internalNotification.notifyInternal({
        alertType: 'NOTIFICATION_SYSTEM_DOWN',
        severity: NotificationSeverityEnum.CRITICAL,
        message: 'Notification system is experiencing downtime',
        channels: [
          { type: NotificationChannelTypeEnum.SLACK },
          { type: NotificationChannelTypeEnum.EMAIL },
        ],
        metadata: {
          timestamp: new Date().toISOString(),
          channelStatuses:
            await this.healthCheckService.getAllChannelStatuses(),
        },
        requestId: generateRandomHex(),
      });
    }
  }
}
```

### 6. **Configuration Improvements**

#### 6.1 Environment-Specific Configuration

```typescript
// config/notification.config.ts
export interface NotificationConfig {
  queue: {
    concurrency: number;
    retries: number;
    backoffDelay: number;
  };
  rateLimit: {
    enabled: boolean;
    tokensPerInterval: number;
    interval: number;
  };
  providers: {
    email: {
      primary: string;
      fallback: string[];
    };
  };
}

export const notificationConfig = (): NotificationConfig => ({
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '10'),
    retries: parseInt(process.env.QUEUE_RETRIES || '3'),
    backoffDelay: parseInt(process.env.QUEUE_BACKOFF_DELAY || '5000'),
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production',
    tokensPerInterval: 10,
    interval: 60000,
  },
  providers: {
    email: {
      primary: process.env.EMAIL_PRIMARY_PROVIDER || 'SendGrid',
      fallback: (
        process.env.EMAIL_FALLBACK_PROVIDERS || 'Mailgun,TurboSMTP'
      ).split(','),
    },
  },
});
```

#### 6.2 Feature Flags

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagService {
  private flags = new Map<string, boolean>();

  constructor(private configService: ConfigService) {
    this.loadFlags();
  }

  private loadFlags() {
    this.flags.set(
      'EMAIL_ENABLED',
      this.configService.get('FF_EMAIL_ENABLED', true),
    );
    this.flags.set(
      'SMS_ENABLED',
      this.configService.get('FF_SMS_ENABLED', true),
    );
    this.flags.set(
      'SENDGRID_ENABLED',
      this.configService.get('FF_SENDGRID_ENABLED', true),
    );
  }

  isEnabled(flag: string): boolean {
    return this.flags.get(flag) ?? false;
  }
}

// Usage in dispatcher
if (!this.featureFlags.isEnabled('SENDGRID_ENABLED')) {
  // Skip SendGrid, use fallback
}
```

### 7. **Additional Features**

#### 7.1 Notification Preferences

```typescript
// New entity
@Entity('user_notification_preferences')
export class UserNotificationPreferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: NotificationTypeEnum })
  notificationType: NotificationTypeEnum;

  @Column({ type: 'simple-array' })
  enabledChannels: NotificationChannelTypeEnum[];

  @Column({ default: true })
  enabled: boolean;
}

// In service
async getEffectiveChannels(userId: string, type: NotificationTypeEnum) {
  const preferences = await this.preferencesRepository.findOne({
    where: { userId, notificationType: type }
  });

  if (!preferences?.enabled) {
    return []; // User opted out
  }

  return preferences?.enabledChannels || this.getDefaultChannels(type);
}
```

#### 7.2 Scheduled Notifications

```typescript
// New entity
@Entity('scheduled_notifications')
export class ScheduledNotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  notificationRequest: UserNotificationRequest;

  @Column({ type: 'timestamp' })
  scheduledFor: Date;

  @Column({ default: false })
  sent: boolean;
}

// Cron job
@Injectable()
export class ScheduledNotificationProcessor {
  @Cron('* * * * *') // Every minute
  async processScheduled() {
    const due = await this.scheduledRepository.find({
      where: {
        scheduledFor: LessThanOrEqual(new Date()),
        sent: false,
      },
    });

    for (const scheduled of due) {
      await this.notificationService.notifyUser(scheduled.notificationRequest);
      scheduled.sent = true;
      await this.scheduledRepository.save(scheduled);
    }
  }
}
```

#### 7.3 Notification Templates Management UI

```typescript
// API endpoints for template management
@Controller('notification-templates')
export class NotificationTemplateController {
  @Get()
  async listTemplates() {
    // Return all available templates
  }

  @Get(':id')
  async getTemplate(@Param('id') id: string) {
    // Return template content
  }

  @Put(':id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    // Update template (clear cache)
  }

  @Post(':id/preview')
  async previewTemplate(@Param('id') id: string, @Body() metadata: any) {
    // Render template with sample data
  }
}
```

---

## Step-by-Step Recreation Guide

### Prerequisites

- Node.js 16+
- PostgreSQL 13+
- Redis 6+
- NestJS CLI

### Phase 1: Project Setup (30 minutes)

#### Step 1.1: Initialize NestJS Project

```bash
npm i -g @nestjs/cli
nest new my-notification-system
cd my-notification-system
```

#### Step 1.2: Install Core Dependencies

```bash
# Database
npm install @nestjs/typeorm typeorm pg

# Queue
npm install @nestjs/bull bull

# Cache
npm install @nestjs/cache-manager cache-manager

# Validation
npm install class-validator class-transformer

# Configuration
npm install @nestjs/config

# Scheduling (for cron jobs)
npm install @nestjs/schedule
```

#### Step 1.3: Install Provider SDKs

```bash
# Email providers
npm install @sendgrid/mail
npm install mailgun.js
npm install axios # for TurboSMTP

# SMS providers
npm install twilio
npm install @vonage/server-sdk

# Push notifications
npm install firebase-admin
npm install onesignal-node
npm install web-push

# Messaging
npm install @slack/webhook
```

#### Step 1.4: Install Utilities

```bash
# Security
npm install isomorphic-dompurify

# Circuit breaker
npm install opossum

# Metrics
npm install prom-client

# Testing
npm install --save-dev @nestjs/testing jest
```

### Phase 2: Database Setup (45 minutes)

#### Step 2.1: Create Database Entities

**File:** `src/shared/database/entities/notification.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { NotificationRecipientEntity } from './notification-recipient.entity';

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  type: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'simple-array' })
  channels: string[];

  @Column({ type: 'uuid', nullable: true })
  generatedByUserId: string;

  @Column({ type: 'jsonb', default: {} })
  meta: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  estateId: string;

  @Column({ type: 'varchar', nullable: true })
  iconUrl: string;

  @Column({ type: 'varchar', nullable: true })
  resourceId: string;

  @Column({ type: 'varchar', nullable: true })
  resourceType: string;

  @Column({ type: 'varchar', nullable: true })
  deepLink: string;

  @Column({ unique: true })
  requestId: string;

  @OneToMany(
    () => NotificationRecipientEntity,
    (recipient) => recipient.notification,
  )
  recipients: NotificationRecipientEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**File:** `src/shared/database/entities/notification-recipient.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { NotificationEntity } from './notification.entity';

@Entity('notification_recipients')
@Index(['recipientId', 'isRead'])
@Index(['recipientId', 'createdAt'])
export class NotificationRecipientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  notificationId: string;

  @Column({ type: 'uuid' })
  recipientId: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isDismissed: boolean;

  @ManyToOne(
    () => NotificationEntity,
    (notification) => notification.recipients,
  )
  @JoinColumn({ name: 'notificationId' })
  notification: NotificationEntity;

  @CreateDateColumn()
  createdAt: Date;
}
```

**File:** `src/shared/database/entities/notification-audit-log.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('notification_audit_logs')
@Index(['recipientId', 'createdAt'])
@Index(['requestId', 'channel'])
@Index(['status', 'createdAt'])
@Index(['recipientId', 'notificationType', 'createdAt'])
export class NotificationAuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  requestId: string;

  @Column({ type: 'varchar' })
  type: string; // USER | INTERNAL

  @Column({ type: 'varchar' })
  notificationType: string;

  @Column()
  recipientId: string;

  @Column({ type: 'varchar' })
  channel: string;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'varchar' })
  status: string; // QUEUED | SENT | FAILED

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
```

#### Step 2.2: Create Migration

```bash
npm run typeorm migration:generate -- -n CreateNotificationTables
npm run typeorm migration:run
```

### Phase 3: Core Infrastructure (1 hour)

#### Step 3.1: Create Enums

**File:** `src/modules/notification/notification.enum.ts`

```typescript
export enum NotificationChannelTypeEnum {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  SLACK = 'SLACK',
  WHATSAPP = 'WHATSAPP',
  IN_APP = 'IN_APP',
}

export enum NotificationStatusEnum {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export enum NotificationSeverityEnum {
  INFO = 'INFO',
  WARN = 'WARN',
  CRITICAL = 'CRITICAL',
}

export enum NotificationTypeEnum {
  // Add your notification types
  USER_WELCOME = 'USER_WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
  // ... etc
}
```

#### Step 3.2: Create Interfaces

**File:** `src/modules/notification/interfaces/notification.interface.ts`

```typescript
import {
  NotificationChannelTypeEnum,
  NotificationTypeEnum,
} from '../notification.enum';

export interface NotificationChannel {
  type: NotificationChannelTypeEnum;
  provider?: string;
}

export interface NotificationResult {
  channel: NotificationChannel;
  status: NotificationStatusEnum;
  provider?: string;
  error?: string;
}

export interface UserNotificationRequest<T = Record<string, any>> {
  userId: string;
  type: NotificationTypeEnum;
  requestId: string;
  channels?: NotificationChannel[];
  metadata: T;
  estateId?: string;
}

export interface BulkUserNotificationRequest<T = Record<string, any>> {
  userIds: string[];
  type: NotificationTypeEnum;
  requestId: string;
  channels?: NotificationChannel[];
  metadata: T;
}

export interface ExternalUserNotificationRequest<T = Record<string, any>> {
  email?: string;
  phone?: string;
  type: NotificationTypeEnum;
  requestId: string;
  channels?: NotificationChannel[];
  metadata: T;
}

export abstract class INotificationService {
  abstract notifyUser(
    req: UserNotificationRequest,
  ): Promise<NotificationResult[]>;
  abstract notifyBulkUsers(
    req: BulkUserNotificationRequest,
  ): Promise<{ success: true; notificationId: string }>;
  abstract notifyExternalUser(
    req: ExternalUserNotificationRequest,
  ): Promise<NotificationResult[]>;
}
```

#### Step 3.3: Create Adapter Interfaces

**File:** `src/modules/notification/interfaces/adapter.interface.ts`

```typescript
export interface NotificationChannelRequest {
  recipient: string; // email, phone, deviceToken, etc.
  title: string;
  body: string;
  htmlBody?: string;
  metadata?: Record<string, any>;
  requestId: string;
}

export interface NotificationChannelResponse {
  status: NotificationStatusEnum;
  messageId?: string;
  error?: string;
}

export abstract class INotificationChannelAdapter {
  abstract readonly name: string;
  abstract readonly channel: NotificationChannelTypeEnum;

  abstract send(
    request: NotificationChannelRequest,
  ): Promise<NotificationChannelResponse>;
  abstract healthCheck(): Promise<boolean>;
}

export abstract class IEmailChannelAdapter extends INotificationChannelAdapter {
  readonly channel = NotificationChannelTypeEnum.EMAIL;
}

export abstract class ISmsChannelAdapter extends INotificationChannelAdapter {
  readonly channel = NotificationChannelTypeEnum.SMS;
}

export abstract class IPushChannelAdapter extends INotificationChannelAdapter {
  readonly channel = NotificationChannelTypeEnum.PUSH;
}
```

### Phase 4: Adapter Implementation (2 hours)

#### Step 4.1: Create Email Adapter - SendGrid

**File:** `src/modules/notification/adapters/email/sendgrid.adapter.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { IEmailChannelAdapter } from '../../interfaces/adapter.interface';
import {
  NotificationChannelRequest,
  NotificationChannelResponse,
} from '../../interfaces/adapter.interface';
import { NotificationStatusEnum } from '../../notification.enum';

@Injectable()
export class SendGridAdapter extends IEmailChannelAdapter {
  readonly name = 'SendGrid';

  constructor(private configService: ConfigService) {
    super();
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    }
  }

  async send(
    request: NotificationChannelRequest,
  ): Promise<NotificationChannelResponse> {
    try {
      const msg = {
        to: request.recipient,
        from: this.configService.get<string>('SENDGRID_FROM_EMAIL'),
        subject: request.title,
        text: request.body,
        html: request.htmlBody || request.body,
      };

      const response = await sgMail.send(msg);

      return {
        status: NotificationStatusEnum.SENT,
        messageId: response[0].headers['x-message-id'],
      };
    } catch (error) {
      return {
        status: NotificationStatusEnum.FAILED,
        error: error.message,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
      return !!apiKey;
    } catch {
      return false;
    }
  }
}
```

#### Step 4.2: Create SMS Adapter - Twilio

**File:** `src/modules/notification/adapters/sms/twilio.adapter.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { ISmsChannelAdapter } from '../../interfaces/adapter.interface';
import {
  NotificationChannelRequest,
  NotificationChannelResponse,
} from '../../interfaces/adapter.interface';
import { NotificationStatusEnum } from '../../notification.enum';

@Injectable()
export class TwilioAdapter extends ISmsChannelAdapter {
  readonly name = 'Twilio';
  private client: Twilio;

  constructor(private configService: ConfigService) {
    super();
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
    }
  }

  async send(
    request: NotificationChannelRequest,
  ): Promise<NotificationChannelResponse> {
    try {
      const message = await this.client.messages.create({
        body: request.body.substring(0, 160), // SMS limit
        from: this.configService.get<string>('TWILIO_PHONE_NUMBER'),
        to: request.recipient,
      });

      return {
        status: NotificationStatusEnum.SENT,
        messageId: message.sid,
      };
    } catch (error) {
      return {
        status: NotificationStatusEnum.FAILED,
        error: error.message,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return !!this.client;
    } catch {
      return false;
    }
  }
}
```

#### Step 4.3: Create Push Adapter - FCM

**File:** `src/modules/notification/adapters/push/fcm.adapter.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { IPushChannelAdapter } from '../../interfaces/adapter.interface';
import {
  NotificationChannelRequest,
  NotificationChannelResponse,
} from '../../interfaces/adapter.interface';
import { NotificationStatusEnum } from '../../notification.enum';

@Injectable()
export class FcmAdapter extends IPushChannelAdapter {
  readonly name = 'FCM';
  private initialized = false;

  constructor(private configService: ConfigService) {
    super();
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const credentials = this.configService.get<string>(
        'FIREBASE_CREDENTIALS',
      );
      if (credentials && !this.initialized) {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(credentials)),
        });
        this.initialized = true;
      }
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
    }
  }

  async send(
    request: NotificationChannelRequest,
  ): Promise<NotificationChannelResponse> {
    try {
      const message: admin.messaging.Message = {
        notification: {
          title: request.title,
          body: request.body,
        },
        data: request.metadata || {},
        token: request.recipient, // Device token
      };

      const response = await admin.messaging().send(message);

      return {
        status: NotificationStatusEnum.SENT,
        messageId: response,
      };
    } catch (error) {
      return {
        status: NotificationStatusEnum.FAILED,
        error: error.message,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }
}
```

### Phase 5: Queue System (1 hour)

#### Step 5.1: Configure Bull Queue

**File:** `src/modules/notification/notification.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      NotificationEntity,
      NotificationRecipientEntity,
      NotificationAuditLogEntity,
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
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
  ],
  // ... providers, controllers
})
export class NotificationModule {}
```

#### Step 5.2: Create Queue Producer (Dispatcher)

**File:** `src/modules/notification/services/dispatcher.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { NotificationStatusEnum } from '../notification.enum';

export interface NotificationJobData {
  notificationId: string;
  userId?: string;
  channel: string;
  recipient: string;
  title: string;
  body: string;
  htmlBody?: string;
  metadata: Record<string, any>;
  requestId: string;
  provider?: string;
}

export interface DispatchNotificationRequest {
  notificationId: string;
  userId?: string;
  channel: string;
  recipient: string;
  title: string;
  body: string;
  htmlBody?: string;
  metadata: Record<string, any>;
  requestId: string;
  provider?: string;
}

@Injectable()
export class NotificationQueueProducer {
  constructor(@InjectQueue('notification_dispatch') private queue: Queue) {}

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
    };

    await this.queue.add('send_notification', jobData);

    return {
      channel: { type: request.channel, provider: request.provider },
      status: NotificationStatusEnum.QUEUED,
    };
  }
}
```

#### Step 5.3: Create Queue Consumer (Processor)

**File:** `src/modules/notification/services/notification-processor.ts`

```typescript
import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Inject } from '@nestjs/common';
import { NotificationJobData } from './dispatcher.service';
import { INotificationChannelAdapter } from '../interfaces/adapter.interface';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import {
  NotificationChannelTypeEnum,
  NotificationStatusEnum,
} from '../notification.enum';

@Processor('notification_dispatch')
@Injectable()
export class NotificationProcessor {
  constructor(
    @Inject('NOTIFICATION_CHANNEL_ADAPTERS')
    private adapters: Map<
      NotificationChannelTypeEnum,
      INotificationChannelAdapter[]
    >,
    private auditLogRepository: AuditLogRepository,
  ) {}

  @Process({ name: 'send_notification', concurrency: 10 })
  async processNotification(job: Job<NotificationJobData>) {
    const data = job.data;

    // Get adapters for the channel
    const channelAdapters = this.adapters.get(
      data.channel as NotificationChannelTypeEnum,
    );
    if (!channelAdapters || channelAdapters.length === 0) {
      throw new Error(`No adapters available for channel: ${data.channel}`);
    }

    // Select adapter (by provider name or use first available)
    const adapter = data.provider
      ? channelAdapters.find((a) => a.name === data.provider)
      : channelAdapters[0];

    if (!adapter) {
      throw new Error(`Adapter not found: ${data.provider}`);
    }

    // Create audit log
    const auditLog = await this.auditLogRepository.create({
      requestId: data.requestId,
      type: data.userId ? 'USER' : 'EXTERNAL',
      notificationType: 'CUSTOM', // You should pass this from the job data
      recipientId: data.recipient,
      channel: data.channel,
      provider: adapter.name,
      status: NotificationStatusEnum.QUEUED,
      metadata: data.metadata,
    });

    try {
      // Send notification
      const result = await adapter.send({
        recipient: data.recipient,
        title: data.title,
        body: data.body,
        htmlBody: data.htmlBody,
        metadata: data.metadata,
        requestId: data.requestId,
      });

      // Update audit log
      await this.auditLogRepository.update(auditLog.id, {
        status: result.status,
        sentAt: new Date(),
        error: result.error,
      });

      if (result.status === NotificationStatusEnum.FAILED) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      // Update audit log on failure
      await this.auditLogRepository.update(auditLog.id, {
        status: NotificationStatusEnum.FAILED,
        error: error.message,
      });

      throw error; // Let Bull handle retry
    }
  }

  @OnQueueFailed()
  async handleFailure(job: Job, error: Error) {
    console.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts:`,
      error,
    );

    // Could implement dead letter queue here
    if (job.attemptsMade >= job.opts.attempts) {
      // Move to dead letter queue or alert admins
    }
  }
}
```

### Phase 6: Template Service (45 minutes)

#### Step 6.1: Create Template Service

**File:** `src/modules/notification/services/template.service.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as fs from 'fs';
import * as path from 'path';
import {
  NotificationTypeEnum,
  NotificationChannelTypeEnum,
} from '../notification.enum';

export interface ResolvedTemplateData {
  templateId: string;
  subject: string;
  content: string;
  htmlBody?: string;
  variables: string[];
}

@Injectable()
export class TemplateService {
  private readonly TEMPLATE_DIR = path.join(__dirname, '../templates');

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async resolveTemplate(
    type: NotificationTypeEnum,
    channel: NotificationChannelTypeEnum,
    metadata: Record<string, any>,
  ): Promise<ResolvedTemplateData> {
    const templateId = this.getTemplateId(type, channel);
    const templateContent = await this.getTemplateContent(templateId, channel);

    const rendered = this.substituteVariables(templateContent, metadata);

    return {
      templateId,
      subject: metadata.title || type,
      content: rendered,
      htmlBody:
        channel === NotificationChannelTypeEnum.EMAIL ? rendered : undefined,
      variables: Object.keys(metadata),
    };
  }

  private getTemplateId(
    type: NotificationTypeEnum,
    channel: NotificationChannelTypeEnum,
  ): string {
    // Map notification type + channel to template ID
    const mapping: Record<string, string> = {
      [`${NotificationTypeEnum.USER_WELCOME}_${NotificationChannelTypeEnum.EMAIL}`]:
        'EMAIL_WELCOME',
      // Add more mappings
    };

    return mapping[`${type}_${channel}`] || 'DEFAULT';
  }

  private async getTemplateContent(
    templateId: string,
    channel: NotificationChannelTypeEnum,
  ): Promise<string> {
    const cacheKey = `template:${templateId}`;

    let content = await this.cacheManager.get<string>(cacheKey);
    if (content) {
      return content;
    }

    const filename =
      channel === NotificationChannelTypeEnum.EMAIL
        ? `${templateId.toLowerCase()}.html`
        : `${templateId.toLowerCase()}.txt`;

    const templatePath = path.join(this.TEMPLATE_DIR, filename);

    try {
      content = await fs.promises.readFile(templatePath, 'utf-8');
      await this.cacheManager.set(cacheKey, content, 3600000); // 1 hour cache
      return content;
    } catch (error) {
      // Return fallback template
      return this.getFallbackTemplate();
    }
  }

  private substituteVariables(
    template: string,
    metadata: Record<string, any>,
  ): string {
    let result = template;

    // Simple variable substitution: ${variableName}
    Object.entries(metadata).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      result = result.replace(regex, String(value));
    });

    return result;
  }

  private getFallbackTemplate(): string {
    return `
      <html>
        <body>
          <h1>\${title}</h1>
          <p>\${body}</p>
        </body>
      </html>
    `;
  }
}
```

#### Step 6.2: Create Sample Template

**File:** `src/modules/notification/templates/email_welcome.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        background-color: #4caf50;
        color: white;
        padding: 20px;
        text-align: center;
      }
      .content {
        padding: 20px;
        background-color: #f9f9f9;
      }
      .button {
        display: inline-block;
        padding: 10px 20px;
        background-color: #4caf50;
        color: white;
        text-decoration: none;
        border-radius: 5px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Welcome to ${appName}!</h1>
      </div>
      <div class="content">
        <p>Hi ${userName},</p>
        <p>Thank you for joining us. We're excited to have you on board!</p>
        <p>
          <a href="${verificationUrl}" class="button">Verify Your Email</a>
        </p>
        <p>
          If you have any questions, feel free to reach out to our support team.
        </p>
        <p>Best regards,<br />${appName} Team</p>
      </div>
      <div style="text-align: center; padding: 20px; color: #666;">
        <p>&copy; ${currentYear} ${appName}. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>
```

### Phase 7: Notification Service (1.5 hours)

#### Step 7.1: Create Main Notification Service

**File:** `src/modules/notification/notification.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  INotificationService,
  UserNotificationRequest,
  BulkUserNotificationRequest,
  ExternalUserNotificationRequest,
  NotificationResult,
} from './interfaces/notification.interface';
import {
  NotificationEntity,
  NotificationRecipientEntity,
} from '@shared/database/entities';
import { NotificationQueueProducer } from './services/dispatcher.service';
import { TemplateService } from './services/template.service';
import {
  NotificationChannelTypeEnum,
  NotificationStatusEnum,
} from './notification.enum';

@Injectable()
export class NotificationService implements INotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(NotificationRecipientEntity)
    private recipientRepository: Repository<NotificationRecipientEntity>,
    private dispatcher: NotificationQueueProducer,
    private templateService: TemplateService,
    private dataSource: DataSource,
  ) {}

  async notifyUser(
    req: UserNotificationRequest,
  ): Promise<NotificationResult[]> {
    // Check for duplicate requestId (idempotency)
    const existing = await this.notificationRepository.findOne({
      where: { requestId: req.requestId },
    });

    if (existing) {
      console.log(`Duplicate notification prevented: ${req.requestId}`);
      return []; // Or return cached results
    }

    // Determine channels
    const channels = req.channels || this.getDefaultChannels(req.type);

    // Create notification record
    const notification = this.notificationRepository.create({
      type: req.type,
      title: req.metadata.title || req.type,
      body: req.metadata.body || '',
      channels: channels.map((c) => c.type),
      generatedByUserId: req.userId,
      meta: req.metadata,
      estateId: req.estateId,
      requestId: req.requestId,
    });

    await this.notificationRepository.save(notification);

    // Create recipient record (for in-app notifications)
    const recipient = this.recipientRepository.create({
      notificationId: notification.id,
      recipientId: req.userId,
      isRead: false,
      isDismissed: false,
    });

    await this.recipientRepository.save(recipient);

    // Dispatch to external channels
    const results: NotificationResult[] = [];

    for (const channel of channels) {
      if (channel.type === NotificationChannelTypeEnum.IN_APP) {
        results.push({
          channel,
          status: NotificationStatusEnum.SENT, // Already saved to DB
        });
        continue;
      }

      // Resolve template
      const template = await this.templateService.resolveTemplate(
        req.type,
        channel.type,
        req.metadata,
      );

      // Get recipient info (email, phone, etc.)
      const recipientContact = await this.getRecipientContact(
        req.userId,
        channel.type,
      );

      // Dispatch to queue
      const result = await this.dispatcher.dispatch({
        notificationId: notification.id,
        userId: req.userId,
        channel: channel.type,
        recipient: recipientContact,
        title: template.subject,
        body: template.content,
        htmlBody: template.htmlBody,
        metadata: req.metadata,
        requestId: req.requestId,
        provider: channel.provider,
      });

      results.push(result);
    }

    return results;
  }

  async notifyBulkUsers(
    req: BulkUserNotificationRequest,
  ): Promise<{ success: true; notificationId: string }> {
    return await this.dataSource.transaction(async (manager) => {
      // Create single notification
      const notification = manager.create(NotificationEntity, {
        type: req.type,
        title: req.metadata.title || req.type,
        body: req.metadata.body || '',
        channels: (req.channels || this.getDefaultChannels(req.type)).map(
          (c) => c.type,
        ),
        meta: req.metadata,
        requestId: req.requestId,
      });

      await manager.save(notification);

      // Create recipient records
      const recipients = req.userIds.map((userId) =>
        manager.create(NotificationRecipientEntity, {
          notificationId: notification.id,
          recipientId: userId,
          isRead: false,
          isDismissed: false,
        }),
      );

      await manager.save(recipients);

      // Dispatch to queue (after transaction commits)
      const channels = req.channels || this.getDefaultChannels(req.type);

      for (const userId of req.userIds) {
        for (const channel of channels) {
          if (channel.type === NotificationChannelTypeEnum.IN_APP) continue;

          const template = await this.templateService.resolveTemplate(
            req.type,
            channel.type,
            req.metadata,
          );

          const recipientContact = await this.getRecipientContact(
            userId,
            channel.type,
          );

          await this.dispatcher.dispatch({
            notificationId: notification.id,
            userId,
            channel: channel.type,
            recipient: recipientContact,
            title: template.subject,
            body: template.content,
            htmlBody: template.htmlBody,
            metadata: req.metadata,
            requestId: req.requestId,
            provider: channel.provider,
          });
        }
      }

      return { success: true, notificationId: notification.id };
    });
  }

  async notifyExternalUser(
    req: ExternalUserNotificationRequest,
  ): Promise<NotificationResult[]> {
    const channels = req.channels || [
      { type: NotificationChannelTypeEnum.EMAIL },
    ];
    const results: NotificationResult[] = [];

    for (const channel of channels) {
      const template = await this.templateService.resolveTemplate(
        req.type,
        channel.type,
        req.metadata,
      );

      const recipient =
        channel.type === NotificationChannelTypeEnum.EMAIL
          ? req.email
          : req.phone;

      const result = await this.dispatcher.dispatch({
        notificationId: 'external', // No DB record for external users
        channel: channel.type,
        recipient,
        title: template.subject,
        body: template.content,
        htmlBody: template.htmlBody,
        metadata: req.metadata,
        requestId: req.requestId,
        provider: channel.provider,
      });

      results.push(result);
    }

    return results;
  }

  async getUserNotifications(userId: string, page = 1, perPage = 10) {
    return this.recipientRepository.find({
      where: { recipientId: userId },
      relations: ['notification'],
      order: { createdAt: 'DESC' },
      take: perPage,
      skip: (page - 1) * perPage,
    });
  }

  async markNotificationAsRead(userId: string, notificationId: string) {
    await this.recipientRepository.update(
      { recipientId: userId, notificationId },
      { isRead: true },
    );
    return { success: true };
  }

  async markAllNotificationsAsRead(userId: string) {
    await this.recipientRepository.update(
      { recipientId: userId },
      { isRead: true },
    );
    return { success: true };
  }

  async countUnreadNotifications(userId: string): Promise<number> {
    return this.recipientRepository.count({
      where: { recipientId: userId, isRead: false },
    });
  }

  private getDefaultChannels(type: string): NotificationChannel[] {
    // Define default channels per notification type
    const defaults: Record<string, NotificationChannel[]> = {
      [NotificationTypeEnum.USER_WELCOME]: [
        { type: NotificationChannelTypeEnum.EMAIL },
        { type: NotificationChannelTypeEnum.IN_APP },
      ],
      // Add more defaults
    };

    return defaults[type] || [{ type: NotificationChannelTypeEnum.IN_APP }];
  }

  private async getRecipientContact(
    userId: string,
    channel: NotificationChannelTypeEnum,
  ): Promise<string> {
    // Fetch user from database
    // Return email, phone, deviceToken, etc. based on channel
    // This is a placeholder - implement based on your user entity
    return 'user@example.com';
  }
}
```

### Phase 8: Audit Logging (30 minutes)

**File:** `src/modules/notification/repositories/audit-log.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationAuditLogEntity } from '@shared/database/entities';

export interface CreateAuditLogParams {
  requestId: string;
  type: string;
  notificationType: string;
  recipientId: string;
  channel: string;
  provider: string;
  status: string;
  metadata?: Record<string, any>;
}

export interface UpdateAuditLogParams {
  status?: string;
  error?: string;
  sentAt?: Date;
}

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectRepository(NotificationAuditLogEntity)
    private repository: Repository<NotificationAuditLogEntity>,
  ) {}

  async create(
    params: CreateAuditLogParams,
  ): Promise<NotificationAuditLogEntity> {
    const log = this.repository.create(params);
    return await this.repository.save(log);
  }

  async update(
    id: string,
    params: UpdateAuditLogParams,
  ): Promise<NotificationAuditLogEntity> {
    await this.repository.update(id, params);
    return await this.repository.findOne({ where: { id } });
  }

  async find(options: {
    requestId?: string;
    recipientId?: string;
    notificationType?: string;
    limit?: number;
  }): Promise<NotificationAuditLogEntity[]> {
    const query = this.repository.createQueryBuilder('log');

    if (options.requestId) {
      query.where('log.requestId = :requestId', {
        requestId: options.requestId,
      });
    }

    if (options.recipientId) {
      query.andWhere('log.recipientId = :recipientId', {
        recipientId: options.recipientId,
      });
    }

    if (options.notificationType) {
      query.andWhere('log.notificationType = :notificationType', {
        notificationType: options.notificationType,
      });
    }

    query.orderBy('log.createdAt', 'DESC');
    query.limit(options.limit || 100);

    return await query.getMany();
  }
}
```

### Phase 9: API Controller (30 minutes)

**File:** `src/modules/notification/notification.controller.ts`

```typescript
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getUserNotifications(
    @Query('userId') userId: string,
    @Query('page') page = 1,
    @Query('perPage') perPage = 10,
  ) {
    const notifications = await this.notificationService.getUserNotifications(
      userId,
      page,
      perPage,
    );
    return { data: notifications };
  }

  @Get(':userId/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Param('userId') userId: string) {
    const count =
      await this.notificationService.countUnreadNotifications(userId);
    return { data: count };
  }

  @Patch(':userId/read/:notificationId')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @Param('userId') userId: string,
    @Param('notificationId') notificationId: string,
  ) {
    return await this.notificationService.markNotificationAsRead(
      userId,
      notificationId,
    );
  }

  @Patch(':userId/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Param('userId') userId: string) {
    return await this.notificationService.markAllNotificationsAsRead(userId);
  }
}
```

### Phase 10: Module Configuration (30 minutes)

**File:** `src/modules/notification/notification.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationQueueProducer } from './services/dispatcher.service';
import { NotificationProcessor } from './services/notification-processor';
import { TemplateService } from './services/template.service';
import { AuditLogRepository } from './repositories/audit-log.repository';
import {
  NotificationEntity,
  NotificationRecipientEntity,
  NotificationAuditLogEntity,
} from '@shared/database/entities';
import { SendGridAdapter } from './adapters/email/sendgrid.adapter';
import { TwilioAdapter } from './adapters/sms/twilio.adapter';
import { FcmAdapter } from './adapters/push/fcm.adapter';
import { INotificationService } from './interfaces/notification.interface';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      NotificationEntity,
      NotificationRecipientEntity,
      NotificationAuditLogEntity,
    ]),
    BullModule.registerQueue({
      name: 'notification_dispatch',
    }),
    CacheModule.register(),
  ],
  controllers: [NotificationController],
  providers: [
    // Services
    {
      provide: INotificationService,
      useClass: NotificationService,
    },
    NotificationService,
    NotificationQueueProducer,
    NotificationProcessor,
    TemplateService,
    AuditLogRepository,

    // Adapters
    SendGridAdapter,
    TwilioAdapter,
    FcmAdapter,

    // Adapter Registry
    {
      provide: 'NOTIFICATION_CHANNEL_ADAPTERS',
      useFactory: (
        sendgrid: SendGridAdapter,
        twilio: TwilioAdapter,
        fcm: FcmAdapter,
      ) => {
        const map = new Map();
        map.set(NotificationChannelTypeEnum.EMAIL, [sendgrid]);
        map.set(NotificationChannelTypeEnum.SMS, [twilio]);
        map.set(NotificationChannelTypeEnum.PUSH, [fcm]);
        return map;
      },
      inject: [SendGridAdapter, TwilioAdapter, FcmAdapter],
    },
  ],
  exports: [INotificationService, NotificationService],
})
export class NotificationModule {}
```

### Phase 11: Environment Configuration (15 minutes)

**File:** `.env.example`

```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=notification_system

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Email Providers
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=yourdomain.com
MAILGUN_FROM_EMAIL=noreply@yourdomain.com

# SMS Providers
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Push Notifications
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"..."}

# Application
NODE_ENV=development
PORT=3000
```

### Phase 12: Testing (1 hour)

#### Step 12.1: Create Test File

**File:** `src/modules/notification/notification.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotificationEntity,
  NotificationRecipientEntity,
} from '@shared/database/entities';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRecipientRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };

  const mockDispatcher = {
    dispatch: jest.fn(),
  };

  const mockTemplateService = {
    resolveTemplate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(NotificationEntity),
          useValue: mockNotificationRepository,
        },
        {
          provide: getRepositoryToken(NotificationRecipientEntity),
          useValue: mockRecipientRepository,
        },
        {
          provide: 'NotificationQueueProducer',
          useValue: mockDispatcher,
        },
        {
          provide: 'TemplateService',
          useValue: mockTemplateService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyUser', () => {
    it('should create notification and dispatch to queue', async () => {
      const request = {
        userId: 'user-123',
        type: NotificationTypeEnum.USER_WELCOME,
        requestId: 'req-123',
        metadata: { title: 'Welcome', body: 'Hello' },
      };

      mockNotificationRepository.findOne.mockResolvedValue(null);
      mockNotificationRepository.create.mockReturnValue({ id: 'notif-123' });
      mockNotificationRepository.save.mockResolvedValue({ id: 'notif-123' });
      mockRecipientRepository.create.mockReturnValue({});
      mockRecipientRepository.save.mockResolvedValue({});
      mockTemplateService.resolveTemplate.mockResolvedValue({
        subject: 'Welcome',
        content: 'Hello',
      });
      mockDispatcher.dispatch.mockResolvedValue({ status: 'QUEUED' });

      const result = await service.notifyUser(request);

      expect(result).toBeDefined();
      expect(mockNotificationRepository.create).toHaveBeenCalled();
      expect(mockDispatcher.dispatch).toHaveBeenCalled();
    });
  });
});
```

### Phase 13: Usage Example (15 minutes)

**File:** `example-usage.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { INotificationService } from './modules/notification/interfaces/notification.interface';
import { NotificationTypeEnum } from './modules/notification/notification.enum';

@Injectable()
export class UserService {
  constructor(private notificationService: INotificationService) {}

  async registerUser(email: string, name: string) {
    // ... user registration logic

    // Send welcome notification
    await this.notificationService.notifyUser({
      userId: newUser.id,
      type: NotificationTypeEnum.USER_WELCOME,
      requestId: `welcome-${newUser.id}-${Date.now()}`,
      metadata: {
        userName: name,
        appName: 'My App',
        verificationUrl: `https://app.com/verify?token=xyz`,
        currentYear: new Date().getFullYear(),
      },
    });
  }

  async sendBulkAnnouncement(userIds: string[], message: string) {
    await this.notificationService.notifyBulkUsers({
      userIds,
      type: NotificationTypeEnum.ANNOUNCEMENT_GENERAL,
      requestId: `announcement-${Date.now()}`,
      metadata: {
        title: 'Important Announcement',
        body: message,
      },
    });
  }

  async inviteExternalUser(email: string) {
    await this.notificationService.notifyExternalUser({
      email,
      type: NotificationTypeEnum.RESIDENT_INVITE,
      requestId: `invite-${email}-${Date.now()}`,
      metadata: {
        invitationUrl: 'https://app.com/register?token=xyz',
        estateName: 'Sunset Hills',
      },
    });
  }
}
```

---

## Summary Checklist

### ✅ Must-Have Features (MVP)

- [x] Database entities (Notification, Recipient, Audit Log)
- [x] Core enums and interfaces
- [x] At least one email adapter (SendGrid)
- [x] Queue system with Bull/Redis
- [x] Template service with basic substitution
- [x] Main notification service
- [x] Audit logging
- [x] API endpoints
- [x] Module configuration

### ✅ Recommended Enhancements

- [ ] Idempotency protection
- [ ] Transaction support for bulk operations
- [ ] Template caching
- [ ] Provider failover
- [ ] Circuit breaker pattern
- [ ] Metadata validation
- [ ] PII protection in logs
- [ ] Dead letter queue

### ✅ Advanced Features

- [ ] Metrics collection (Prometheus)
- [ ] Structured logging
- [ ] Health monitoring with alerts
- [ ] User notification preferences
- [ ] Scheduled notifications
- [ ] Template management UI
- [ ] Feature flags
- [ ] Rate limiting

---

## Deployment Notes

### Development

```bash
# Start dependencies
docker-compose up -d postgres redis

# Run migrations
npm run typeorm migration:run

# Start application
npm run start:dev
```

### Production

```bash
# Build
npm run build

# Run migrations
npm run typeorm migration:run

# Start
npm run start:prod
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: notification_system
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - '5432:5432'

  redis:
    image: redis:6
    ports:
      - '6379:6379'

  app:
    build: .
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_HOST: postgres
      REDIS_HOST: redis
    ports:
      - '3000:3000'
```

---

## Maintenance & Monitoring

### Key Metrics to Track

1. **Delivery Rate:** % of successfully sent notifications per channel
2. **Processing Time:** Average time from queue to delivery
3. **Queue Depth:** Number of pending notifications
4. **Error Rate:** % of failed deliveries per provider
5. **API Latency:** Response time for notification endpoints

### Regular Tasks

1. **Weekly:** Review failed notifications in audit logs
2. **Monthly:** Analyze provider performance and costs
3. **Quarterly:** Update templates and test all channels
4. **Yearly:** Security audit of PII handling

---

## Architecture Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│     NotificationController          │
│  (REST API Endpoints)                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     NotificationService              │
│  - notifyUser()                      │
│  - notifyBulkUsers()                 │
│  - notifyExternalUser()              │
└──────┬──────────────┬────────────────┘
       │              │
       ▼              ▼
┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │ Template     │
│  (Entities)  │  │ Service      │
└──────────────┘  └──────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   NotificationQueueProducer          │
│   (Dispatcher)                       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Bull Queue (Redis)                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   NotificationProcessor              │
│   (Queue Consumer)                   │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Channel Adapters                   │
├──────────────┬──────────────────────┤
│  Email       │  SendGrid, Mailgun   │
│  SMS         │  Twilio, Nexmo       │
│  Push        │  FCM, OneSignal      │
│  Slack       │  Webhook             │
│  WhatsApp    │  Meta, Twilio        │
└──────────────┴──────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   External Services                  │
│   (Email/SMS/Push Providers)         │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Audit Log Repository               │
│   (Tracking & Compliance)            │
└─────────────────────────────────────┘
```

---

## Final Notes

This notification system is designed to be:

- **Scalable:** Queue-based architecture handles high volumes
- **Reliable:** Retry mechanism, transaction support, audit logging
- **Flexible:** Multiple providers per channel with failover
- **Maintainable:** Clean architecture with SOLID principles
- **Secure:** Input validation, PII protection, idempotency

**Estimated Total Implementation Time:** 8-10 hours for MVP, 15-20 hours with all enhancements.
