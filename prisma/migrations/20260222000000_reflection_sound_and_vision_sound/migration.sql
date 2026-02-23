-- CreateTable
CREATE TABLE "ReflectionSound" (
    "id" TEXT NOT NULL,
    "reflectionSessionId" TEXT NOT NULL,
    "soundUrl" TEXT NOT NULL,
    "name" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReflectionSound_pkey" PRIMARY KEY ("id")
);

-- DropForeignKey
ALTER TABLE "ReflectionSession" DROP CONSTRAINT IF EXISTS "ReflectionSession_backgroundSoundId_fkey";

-- AlterTable
ALTER TABLE "ReflectionSession" DROP COLUMN "backgroundSoundId";

-- CreateIndex
CREATE UNIQUE INDEX "ReflectionSound_reflectionSessionId_key" ON "ReflectionSound"("reflectionSessionId");

-- AddForeignKey
ALTER TABLE "ReflectionSound" ADD CONSTRAINT "ReflectionSound_reflectionSessionId_fkey" FOREIGN KEY ("reflectionSessionId") REFERENCES "ReflectionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
