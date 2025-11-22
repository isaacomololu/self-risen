-- AlterTable
ALTER TABLE "ReflectionSession" ADD COLUMN     "aiAffirmationAudioUrl" TEXT,
ADD COLUMN     "beliefRerecordCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "beliefRerecordedAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "lastPlayedAt" TIMESTAMP(3),
ADD COLUMN     "playbackCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sessionDurationDays" INTEGER,
ADD COLUMN     "userAffirmationAudioUrl" TEXT;

-- CreateIndex
CREATE INDEX "ReflectionSession_expiresAt_status_idx" ON "ReflectionSession"("expiresAt", "status");
