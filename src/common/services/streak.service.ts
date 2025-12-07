import { Injectable, Logger } from "@nestjs/common";
import { User } from "@prisma/client";
import { DatabaseProvider } from "src/database/database.provider";
import { INotificationService } from "src/notifications/interfaces/notification.interface";
import { NotificationTypeEnum, NotificationChannelTypeEnum } from "src/notifications/enums/notification.enum";
import { randomUUID } from "crypto";

@Injectable()
export class StreakService {
    private readonly logger = new Logger(StreakService.name);

    constructor(
        private prisma: DatabaseProvider,
        private notificationService: INotificationService,
    ) { }

    async updateStreak(user: User) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastStreakDate = user.lastStreakDate ?
            new Date(user.lastStreakDate.getFullYear(), user.lastStreakDate.getMonth(), user.lastStreakDate.getDate()) : null;


        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let streak = user.streak;
        if (!lastStreakDate) {
            streak = 1;
            const lastStreakAt = today;
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    streak,
                    lastStreakDate: lastStreakAt,
                }
            });
            return;
        }

        else if (lastStreakDate.getTime() === yesterday.getTime()) {
            streak = user.streak + 1;
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    streak,
                    lastStreakDate: today,
                }
            });
            
            // Check if streak is a milestone and send notification
            if (this.isStreakMilestone(streak)) {
                try {
                    const requestId = `streak-milestone-${user.id}-${Date.now()}-${randomUUID()}`;
                    await this.notificationService.notifyUser({
                        userId: user.id,
                        type: NotificationTypeEnum.STREAK_MILESTONE,
                        requestId,
                        channels: [
                            { type: NotificationChannelTypeEnum.PUSH },
                            { type: NotificationChannelTypeEnum.IN_APP },
                        ],
                        metadata: {
                            title: `🎉 ${streak} Day Streak!`,
                            body: `Congratulations! You've maintained a ${streak}-day streak!`,
                            streak: streak,
                        },
                    });
                } catch (notificationError) {
                    this.logger.warn(`Failed to send streak milestone notification: ${notificationError.message}`);
                }
            }
            
            return;
        }

        else if (lastStreakDate.getTime() === today.getTime()) {
            return;
        }

        else {
            streak = 1;
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    streak,
                    lastStreakDate: today,
                }
            });
            return;
        }
    }

    /**
     * Check if streak value is a milestone (10, 50, 100, or multiple of 50)
     */
    private isStreakMilestone(streak: number): boolean {
        return streak === 10 || streak === 50 || streak === 100 || (streak > 100 && streak % 50 === 0);
    }
}