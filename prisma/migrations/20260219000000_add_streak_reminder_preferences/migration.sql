-- AlterTable
ALTER TABLE "User" ADD COLUMN     "streakReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "streakReminderTimes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';
