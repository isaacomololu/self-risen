/*
  Warnings:

  - You are about to drop the column `completedAt` on the `WheelAssessment` table. All the data in the column will be lost.
  - You are about to drop the column `focusCategoryId` on the `WheelAssessment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WheelAssessment" DROP COLUMN "completedAt",
DROP COLUMN "focusCategoryId";

-- CreateTable
CREATE TABLE "WheelFocus" (
    "id" TEXT NOT NULL,
    "wheelId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "wheelAssessmentId" TEXT,

    CONSTRAINT "WheelFocus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WheelFocus_wheelId_idx" ON "WheelFocus"("wheelId");

-- CreateIndex
CREATE INDEX "WheelFocus_categoryId_idx" ON "WheelFocus"("categoryId");

-- CreateIndex
CREATE INDEX "WheelFocus_wheelId_isActive_idx" ON "WheelFocus"("wheelId", "isActive");

-- AddForeignKey
ALTER TABLE "WheelFocus" ADD CONSTRAINT "WheelFocus_wheelId_fkey" FOREIGN KEY ("wheelId") REFERENCES "WheelOfLife"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelFocus" ADD CONSTRAINT "WheelFocus_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "WheelCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelFocus" ADD CONSTRAINT "WheelFocus_wheelAssessmentId_fkey" FOREIGN KEY ("wheelAssessmentId") REFERENCES "WheelAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
