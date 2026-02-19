import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseProvider } from 'src/database/database.provider';
import { INotificationService } from 'src/notifications/interfaces/notification.interface';
import { NotificationTypeEnum, NotificationChannelTypeEnum } from 'src/notifications/enums/notification.enum';
import { randomUUID } from 'crypto';

type ReminderKind = 'morning' | 'evening';

const MORNING_MESSAGES: Array<(streak: number) => { title: string; body: string }> = [
  (n) => ({ title: `${n}-day streak 🔥`, body: "Start today right — one reflection or vision and you're golden." }),
  (n) => ({ title: `${n} days strong`, body: "Keep the momentum. Your morning check-in is waiting." }),
  (n) => ({ title: `Good morning, streak keeper`, body: `You're at ${n} days. Don't break the chain today.` }),
  (n) => ({ title: `${n} in a row`, body: "Quick reflection or vision board moment — you've got this." }),
];

const EVENING_MESSAGES: Array<(streak: number) => { title: string; body: string }> = [
  (n) => ({ title: `${n}-day streak 🔥`, body: "One reflection or vision before bed and today counts." }),
  (n) => ({ title: `Don't let it slip`, body: `You're at ${n} days. Evening check-in? You've got this.` }),
  (n) => ({ title: `${n} days strong`, body: "Close the day with a quick reflection or vision. Keep the streak alive." }),
  (n) => ({ title: `Streak reminder`, body: `${n} days in a row. Add a reflection or vision and call it a win.` }),
];

@Injectable()
export class StreakReminderService {
  private readonly logger = new Logger(StreakReminderService.name);

  constructor(
    private readonly prisma: DatabaseProvider,
    private readonly notificationService: INotificationService,
  ) {}

  /** 8:00 UTC */
  @Cron('0 8 * * *')
  async sendMorningReminders() {
    await this.sendReminders('morning');
  }

  /** 18:00 UTC (6 PM) */
  @Cron('0 18 * * *')
  async sendEveningReminders() {
    await this.sendReminders('evening');
  }

  private async sendReminders(kind: ReminderKind) {
    const users = await this.prisma.user.findMany({
      where: {
        streak: { gt: 0 },
        fcmTokens: { isEmpty: false },
      },
      select: { id: true, streak: true },
    });

    if (users.length === 0) {
      this.logger.debug(`Streak reminders (${kind}): no eligible users`);
      return;
    }

    const messages = kind === 'morning' ? MORNING_MESSAGES : EVENING_MESSAGES;
    const dateKey = new Date().toISOString().slice(0, 10);

    for (const user of users) {
      try {
        const pick = messages[Math.floor(Math.random() * messages.length)];
        const { title, body } = pick(user.streak);
        const requestId = `streak-reminder-${user.id}-${dateKey}-${kind}-${randomUUID()}`;

        await this.notificationService.notifyUser({
          userId: user.id,
          type: NotificationTypeEnum.STREAK_REMINDER,
          requestId,
          channels: [
            { type: NotificationChannelTypeEnum.PUSH },
            { type: NotificationChannelTypeEnum.IN_APP },
          ],
          metadata: {
            title,
            body,
            streak: user.streak,
            reminderKind: kind,
          },
        });
      } catch (err) {
        this.logger.warn(`Streak reminder failed for user ${user.id}: ${err.message}`);
      }
    }

    this.logger.log(`Streak reminders (${kind}): sent to ${users.length} users`);
  }
}
