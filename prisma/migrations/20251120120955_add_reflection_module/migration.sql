-- CreateEnum
CREATE TYPE "ReflectionSessionStatus" AS ENUM ('PENDING', 'BELIEF_CAPTURED', 'AFFIRMATION_GENERATED', 'APPROVED', 'COMPLETED');

-- CreateTable
CREATE TABLE "ReflectionSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "wheelFocusId" TEXT,
    "prompt" TEXT NOT NULL,
    "rawBeliefText" TEXT,
    "audioUrl" TEXT,
    "transcriptionText" TEXT,
    "limitingBelief" TEXT,
    "generatedAffirmation" TEXT,
    "approvedAffirmation" TEXT,
    "status" "ReflectionSessionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ReflectionSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReflectionSession_userId_idx" ON "ReflectionSession"("userId");

-- CreateIndex
CREATE INDEX "ReflectionSession_categoryId_idx" ON "ReflectionSession"("categoryId");

-- CreateIndex
CREATE INDEX "ReflectionSession_wheelFocusId_idx" ON "ReflectionSession"("wheelFocusId");

-- CreateIndex
CREATE INDEX "ReflectionSession_userId_status_idx" ON "ReflectionSession"("userId", "status");

-- CreateIndex
CREATE INDEX "ReflectionSession_userId_createdAt_idx" ON "ReflectionSession"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReflectionSession" ADD CONSTRAINT "ReflectionSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReflectionSession" ADD CONSTRAINT "ReflectionSession_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "WheelCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReflectionSession" ADD CONSTRAINT "ReflectionSession_wheelFocusId_fkey" FOREIGN KEY ("wheelFocusId") REFERENCES "WheelFocus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
