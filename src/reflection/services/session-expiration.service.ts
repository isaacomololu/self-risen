import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseProvider } from 'src/database/database.provider';
import { BaseService } from 'src/common';

@Injectable()
export class SessionExpirationService extends BaseService {
    private readonly logger = new Logger(SessionExpirationService.name);

    constructor(private prisma: DatabaseProvider) {
        super();
    }

    /**
     * Cron job that runs every minute to check and complete expired sessions
     */
    @Cron('*/1 * * * *') // Every minute
    async checkAndCompleteExpiredSessions() {
        this.logger.log('Checking and completing expired sessions');
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

            this.logger.log(`Completed ${result.count} expired session(s)`);
        } catch (error) {
            this.logger.error(
                `Error checking expired sessions: ${error.message}`,
                error.stack,
            );
        }
    }

    private async updateUserSessions(userId: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                sessions: { increment: 1 },
            },
        });
    }
}

