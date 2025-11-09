import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from 'src/database/database.provider';
import { NotificationChannelTypeEnum } from '../enums/notification.enum';

export interface DeadLetterQueueEntry {
  requestId: string;
  notificationId: string;
  userId?: string;
  channel: NotificationChannelTypeEnum;
  recipient: string;
  notificationType: string;
  attempts: number;
  lastError: string;
  jobData: Record<string, any>;
  failedAt: Date;
}

export interface CreateDLQParams {
  requestId: string;
  notificationId: string;
  userId?: string;
  channel: NotificationChannelTypeEnum;
  recipient: string;
  notificationType: string;
  attempts: number;
  lastError: string;
  jobData: Record<string, any>;
}

@Injectable()
export class DeadLetterQueueRepository {
  constructor(private prisma: DatabaseProvider) {}

  async create(params: CreateDLQParams): Promise<DeadLetterQueueEntry> {
    const entry = await this.prisma.notificationDeadLetterQueue.create({
      data: {
        requestId: params.requestId,
        notificationId: params.notificationId,
        userId: params.userId,
        channel: params.channel,
        recipient: params.recipient,
        notificationType: params.notificationType,
        attempts: params.attempts,
        lastError: params.lastError,
        jobData: params.jobData,
        failedAt: new Date(),
      },
    });

    return {
      requestId: entry.requestId,
      notificationId: entry.notificationId,
      userId: entry.userId || undefined,
      channel: entry.channel as NotificationChannelTypeEnum,
      recipient: entry.recipient,
      notificationType: entry.notificationType,
      attempts: entry.attempts,
      lastError: entry.lastError,
      jobData: entry.jobData as Record<string, any>,
      failedAt: entry.failedAt,
    };
  }

  async findByRequestId(requestId: string) {
    return await this.prisma.notificationDeadLetterQueue.findMany({
      where: { requestId },
      orderBy: { failedAt: 'desc' },
    });
  }

  async findByUserId(userId: string, limit = 100) {
    return await this.prisma.notificationDeadLetterQueue.findMany({
      where: { userId },
      orderBy: { failedAt: 'desc' },
      take: limit,
    });
  }

  async findAll(limit = 100, offset = 0) {
    return await this.prisma.notificationDeadLetterQueue.findMany({
      orderBy: { failedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async countAll(): Promise<number> {
    return await this.prisma.notificationDeadLetterQueue.count();
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.notificationDeadLetterQueue.delete({
      where: { id },
    });
  }

  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.prisma.notificationDeadLetterQueue.deleteMany({
      where: {
        failedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
