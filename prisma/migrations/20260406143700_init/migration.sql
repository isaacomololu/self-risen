/*
  Warnings:

  - A unique constraint covering the columns `[visionBoardId,reflectionSessionId]` on the table `Vision` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Vision_reflectionSessionId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Vision_visionBoardId_reflectionSessionId_key" ON "Vision"("visionBoardId", "reflectionSessionId");
