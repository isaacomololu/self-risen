import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { DatabaseProvider } from 'src/database/database.provider';
import { INotificationService } from 'src/notifications/interfaces/notification.interface';
import {
    NotificationChannelTypeEnum,
    NotificationTypeEnum,
} from 'src/notifications/enums/notification.enum';

const MAX_USERS_PER_RUN = 500;
const NOTIFY_BATCH_SIZE = 25;

function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

function getCurrentTimeInZone(
    timezone: string,
    now?: Date,
): { timeStr: string } {
    const instant = now ?? new Date();
    const parts = instant
        .toLocaleString('en-CA', {
            timeZone: timezone,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
        })
        .split(':');
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return { timeStr };
}

@Injectable()
export class LoopReminderService {
    private readonly logger = new Logger(LoopReminderService.name);

    constructor(
        private readonly prisma: DatabaseProvider,
        private readonly notificationService: INotificationService,
    ) {}

    @Cron('0 * * * *')
    async sendLoopReminders() {
        const now = new Date();
        const dateKey = now.toISOString().slice(0, 10);

        const users = await this.prisma.user.findMany({
            where: {
                loopReminderEnabled: true,
                pushTokens: { isEmpty: false },
                OR: [
                    { loopReminderMorning: { not: null } },
                    { loopReminderEvening: { not: null } },
                ],
            },
            select: {
                id: true,
                timezone: true,
                loopReminderMorning: true,
                loopReminderEvening: true,
            },
            orderBy: { id: 'asc' },
            take: MAX_USERS_PER_RUN,
        });

        const toNotify: Array<{
            id: string;
            kind: 'morning' | 'evening';
        }> = [];

        for (const user of users) {
            const tz = (user.timezone || 'UTC').trim() || 'UTC';
            const { timeStr } = getCurrentTimeInZone(tz, now);

            if (user.loopReminderMorning === timeStr) {
                toNotify.push({ id: user.id, kind: 'morning' });
            } else if (user.loopReminderEvening === timeStr) {
                toNotify.push({ id: user.id, kind: 'evening' });
            }
        }

        for (const batch of chunk(toNotify, NOTIFY_BATCH_SIZE)) {
            const results = await Promise.allSettled(
                batch.map((user) => {
                    const isMorning = user.kind === 'morning';
                    const title = isMorning
                        ? 'Morning affirmation loop'
                        : 'Evening affirmation loop';
                    const body = isMorning
                        ? 'Start your day with your affirmation audio loop.'
                        : 'Wind down with your affirmation audio loop.';

                    return this.notificationService.notifyUser({
                        userId: user.id,
                        type: NotificationTypeEnum.AFFIRMATION_LOOP_REMINDER,
                        requestId: `loop-reminder-${user.id}-${dateKey}-${user.kind}-${randomUUID()}`,
                        channels: [
                            { type: NotificationChannelTypeEnum.PUSH },
                            { type: NotificationChannelTypeEnum.IN_APP },
                        ],
                        metadata: {
                            title,
                            body,
                            reminderKind: user.kind,
                            screen: 'AffirmationLoop',
                        },
                    });
                }),
            );

            results.forEach((result, i) => {
                if (result.status === 'rejected') {
                    this.logger.warn(
                        `Loop reminder failed for user ${batch[i].id}: ${result.reason?.message ?? result.reason}`,
                    );
                }
            });
        }

        if (toNotify.length > 0) {
            this.logger.debug(`Loop reminders sent to ${toNotify.length} users`);
        }
    }
}
