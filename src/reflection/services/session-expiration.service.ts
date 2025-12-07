import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseProvider } from 'src/database/database.provider';
import { BaseService } from 'src/common';
import { INotificationService } from 'src/notifications/interfaces/notification.interface';
import { NotificationTypeEnum, NotificationChannelTypeEnum } from 'src/notifications/enums/notification.enum';
import { randomUUID } from 'crypto';

@Injectable()
export class SessionExpirationService extends BaseService {
    private readonly logger = new Logger(SessionExpirationService.name);

    constructor(
        private prisma: DatabaseProvider,
        private notificationService: INotificationService,
    ) {
        super();
    }

    /**
     * Cron job that runs every minute to check and complete expired sessions
     */
    @Cron('*/1 * * * *') // Every minute
    async checkAndCompleteExpiredSessions() {
        this.logger.log('Checking and completing expired sessions');
        console.log('Checking and completing expired sessions');
        try {
            const now = new Date();

            // Find all sessions that have expired and are not yet completed
            const expiredSessions = await this.prisma.reflectionSession.findMany({
                where: {
                    expiresAt: {
                        lte: now,
                    },
                    status: {
                        not: 'COMPLETED',
                    },
                },
                select: {
                    id: true,
                    userId: true,
                    status: true,
                },
            });

            if (expiredSessions.length === 0) {
                return; // No expired sessions to process
            }

            this.logger.log(`Found ${expiredSessions.length} expired session(s) to complete`);

            // Update all expired sessions to COMPLETED status
            const result = await this.prisma.reflectionSession.updateMany({
                where: {
                    id: {
                        in: expiredSessions.map((s) => s.id),
                    },
                },
                data: {
                    status: 'COMPLETED',
                    completedAt: now,
                },
            });

            await Promise.all(expiredSessions.map(async (session) => {
                await this.updateUserSessions(session.userId);
            }));
            console.log('Completed expired sessions');

            this.logger.log(`Completed ${result.count} expired session(s)`);
        } catch (error) {
            this.logger.error(
                `Error checking expired sessions: ${error.message}`,
                error.stack,
            );
        }
    }

    private async updateUserSessions(userId: string) {
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                sessions: { increment: 1 },
            },
            select: {
                sessions: true,
            },
        });

        // Send push notification for session completion
        try {
            const requestId = `session-completed-${userId}-${Date.now()}-${randomUUID()}`;
            await this.notificationService.notifyUser({
                userId: userId,
                type: NotificationTypeEnum.SESSION_COMPLETED,
                requestId,
                channels: [
                    { type: NotificationChannelTypeEnum.PUSH },
                    { type: NotificationChannelTypeEnum.IN_APP },
                ],
                metadata: {
                    title: 'Session Completed!',
                    body: `Great work! You've completed ${updatedUser.sessions} reflection session${updatedUser.sessions === 1 ? '' : 's'}!`,
                    totalSessions: updatedUser.sessions,
                },
            });
        } catch (notificationError) {
            this.logger.warn(`Failed to send session completion notification: ${notificationError.message}`);
        }
    }
}

