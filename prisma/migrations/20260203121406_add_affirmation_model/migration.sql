-- AlterTable
ALTER TABLE "User" ALTER COLUMN "tokenLimitPerMonth" SET DEFAULT 30000;

-- CreateTable
CREATE TABLE "Affirmation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "affirmationText" TEXT NOT NULL,
    "audioUrl" TEXT,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Affirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Affirmation_sessionId_idx" ON "Affirmation"("sessionId");

-- CreateIndex
CREATE INDEX "Affirmation_sessionId_isSelected_idx" ON "Affirmation"("sessionId", "isSelected");

-- CreateIndex
CREATE INDEX "Affirmation_sessionId_order_idx" ON "Affirmation"("sessionId", "order");

-- AddForeignKey
ALTER TABLE "Affirmation" ADD CONSTRAINT "Affirmation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReflectionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
