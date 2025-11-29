import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { DatabaseProvider } from "src/database/database.provider";

@Injectable()
export class StreakService {
    constructor(private prisma: DatabaseProvider) { }

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
}