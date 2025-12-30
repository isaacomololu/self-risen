/*
  Warnings:

  - You are about to drop the column `userId` on the `Vision` table. All the data in the column will be lost.
  - Added the required column `visionBoardId` to the `Vision` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable (first, so we can reference it)
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

-- AddForeignKey
ALTER TABLE "VisionBoard" ADD CONSTRAINT "VisionBoard_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "WheelCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionBoard" ADD CONSTRAINT "VisionBoard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add visionBoardId as nullable first
ALTER TABLE "Vision" ADD COLUMN "visionBoardId" TEXT;

-- Create VisionBoards for existing Visions and link them
-- Get the first category for each user to create a default VisionBoard
INSERT INTO "VisionBoard" ("id", "categoryId", "userId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::TEXT,
    wc.id,
    v."userId",
    NOW(),
    NOW()
FROM "Vision" v
INNER JOIN "WheelOfLife" wol ON wol."userId" = v."userId"
INNER JOIN "WheelCategory" wc ON wc."wheelId" = wol.id
WHERE NOT EXISTS (SELECT 1 FROM "VisionBoard" vb WHERE vb."userId" = v."userId")
GROUP BY v."userId", wc.id
LIMIT 1;

-- Update existing Visions to link to their user's VisionBoard
UPDATE "Vision" v
SET "visionBoardId" = vb.id
FROM "VisionBoard" vb
WHERE vb."userId" = v."userId";

-- Delete any orphaned Visions that couldn't be linked
DELETE FROM "Vision" WHERE "visionBoardId" IS NULL;

-- Now make visionBoardId NOT NULL
ALTER TABLE "Vision" ALTER COLUMN "visionBoardId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "public"."Vision" DROP CONSTRAINT "Vision_userId_fkey";

-- DropIndex
DROP INDEX "public"."Vision_userId_idx";

-- DropIndex
DROP INDEX "public"."Vision_userId_order_idx";

-- AlterTable - drop userId
ALTER TABLE "Vision" DROP COLUMN "userId";

-- CreateIndex
CREATE INDEX "Vision_visionBoardId_idx" ON "Vision"("visionBoardId");

-- CreateIndex
CREATE INDEX "Vision_visionBoardId_order_idx" ON "Vision"("visionBoardId", "order");

-- AddForeignKey
ALTER TABLE "Vision" ADD CONSTRAINT "Vision_visionBoardId_fkey" FOREIGN KEY ("visionBoardId") REFERENCES "VisionBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
