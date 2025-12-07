-- CreateTable
CREATE TABLE "VisionBoardSound" (
    "id" TEXT NOT NULL,
    "soundUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionBoardSound_pkey" PRIMARY KEY ("id")
);
