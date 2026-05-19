-- CreateEnum
CREATE TYPE "AffirmationLoopStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "loopReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "loopReminderEvening" TEXT,
ADD COLUMN     "loopReminderMorning" TEXT,
ADD COLUMN     "loopTokensRemaining" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "AffirmationLoop" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AffirmationLoopStatus" NOT NULL DEFAULT 'PROCESSING',
    "audioPath" TEXT,
    "durationSeconds" INTEGER,
    "backgroundMusicKey" TEXT NOT NULL,
    "voicePreference" "TtsVoicePreference",
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffirmationLoop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffirmationLoopItem" (
    "loopId" TEXT NOT NULL,
    "affirmationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "AffirmationLoopItem_pkey" PRIMARY KEY ("loopId","affirmationId")
);

-- CreateIndex
CREATE INDEX "AffirmationLoop_userId_createdAt_idx" ON "AffirmationLoop"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AffirmationLoop_userId_status_idx" ON "AffirmationLoop"("userId", "status");

-- CreateIndex
CREATE INDEX "AffirmationLoopItem_affirmationId_idx" ON "AffirmationLoopItem"("affirmationId");

-- CreateIndex
CREATE UNIQUE INDEX "AffirmationLoopItem_loopId_sortOrder_key" ON "AffirmationLoopItem"("loopId", "sortOrder");

-- AddForeignKey
ALTER TABLE "AffirmationLoop" ADD CONSTRAINT "AffirmationLoop_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffirmationLoopItem" ADD CONSTRAINT "AffirmationLoopItem_loopId_fkey" FOREIGN KEY ("loopId") REFERENCES "AffirmationLoop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffirmationLoopItem" ADD CONSTRAINT "AffirmationLoopItem_affirmationId_fkey" FOREIGN KEY ("affirmationId") REFERENCES "Affirmation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
