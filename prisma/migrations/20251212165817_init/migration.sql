/*
  Warnings:

  - You are about to drop the `VisionBoard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VisionBoardItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."VisionBoard" DROP CONSTRAINT "VisionBoard_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VisionBoardItem" DROP CONSTRAINT "VisionBoardItem_reflectionSessionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VisionBoardItem" DROP CONSTRAINT "VisionBoardItem_visionBoardId_fkey";

-- DropTable
DROP TABLE "public"."VisionBoard";

-- DropTable
DROP TABLE "public"."VisionBoardItem";

-- CreateTable
CREATE TABLE "Vision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reflectionSessionId" TEXT,
    "imageUrl" TEXT,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vision_reflectionSessionId_key" ON "Vision"("reflectionSessionId");

-- CreateIndex
CREATE INDEX "Vision_userId_idx" ON "Vision"("userId");

-- CreateIndex
CREATE INDEX "Vision_reflectionSessionId_idx" ON "Vision"("reflectionSessionId");

-- CreateIndex
CREATE INDEX "Vision_userId_order_idx" ON "Vision"("userId", "order");

-- AddForeignKey
ALTER TABLE "Vision" ADD CONSTRAINT "Vision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vision" ADD CONSTRAINT "Vision_reflectionSessionId_fkey" FOREIGN KEY ("reflectionSessionId") REFERENCES "ReflectionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
