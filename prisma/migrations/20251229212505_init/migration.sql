/*
  Warnings:

  - You are about to drop the column `userId` on the `Vision` table. All the data in the column will be lost.
  - Added the required column `visionBoardId` to the `Vision` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Vision" DROP CONSTRAINT "Vision_userId_fkey";

-- DropIndex
DROP INDEX "public"."Vision_userId_idx";

-- DropIndex
DROP INDEX "public"."Vision_userId_order_idx";

-- AlterTable
ALTER TABLE "Vision" DROP COLUMN "userId",
ADD COLUMN     "visionBoardId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "VisionBoard" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionBoard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisionBoard_categoryId_key" ON "VisionBoard"("categoryId");

-- CreateIndex
CREATE INDEX "VisionBoard_categoryId_idx" ON "VisionBoard"("categoryId");

-- CreateIndex
CREATE INDEX "VisionBoard_userId_idx" ON "VisionBoard"("userId");

-- CreateIndex
CREATE INDEX "Vision_visionBoardId_idx" ON "Vision"("visionBoardId");

-- CreateIndex
CREATE INDEX "Vision_visionBoardId_order_idx" ON "Vision"("visionBoardId", "order");

-- AddForeignKey
ALTER TABLE "VisionBoard" ADD CONSTRAINT "VisionBoard_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "WheelCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionBoard" ADD CONSTRAINT "VisionBoard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vision" ADD CONSTRAINT "Vision_visionBoardId_fkey" FOREIGN KEY ("visionBoardId") REFERENCES "VisionBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
