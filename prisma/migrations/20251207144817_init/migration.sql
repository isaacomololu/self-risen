/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `ReflectionSession` table. All the data in the column will be lost.
  - You are about to drop the column `sessionDurationDays` on the `ReflectionSession` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."ReflectionSession_expiresAt_status_idx";

-- AlterTable
ALTER TABLE "ReflectionSession" DROP COLUMN "expiresAt",
DROP COLUMN "sessionDurationDays";

-- CreateTable
CREATE TABLE "Wave" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Wave_sessionId_isActive_idx" ON "Wave"("sessionId", "isActive");

-- CreateIndex
CREATE INDEX "Wave_endDate_isActive_idx" ON "Wave"("endDate", "isActive");

-- AddForeignKey
ALTER TABLE "Wave" ADD CONSTRAINT "Wave_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReflectionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
