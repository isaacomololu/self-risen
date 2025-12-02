-- CreateTable
CREATE TABLE "VisionBoard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisionBoardItem" (
    "id" TEXT NOT NULL,
    "visionBoardId" TEXT NOT NULL,
    "reflectionSessionId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionBoardItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisionBoard_userId_key" ON "VisionBoard"("userId");

-- CreateIndex
CREATE INDEX "VisionBoard_userId_idx" ON "VisionBoard"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VisionBoardItem_reflectionSessionId_key" ON "VisionBoardItem"("reflectionSessionId");

-- CreateIndex
CREATE INDEX "VisionBoardItem_visionBoardId_idx" ON "VisionBoardItem"("visionBoardId");

-- CreateIndex
CREATE INDEX "VisionBoardItem_reflectionSessionId_idx" ON "VisionBoardItem"("reflectionSessionId");

-- CreateIndex
CREATE INDEX "VisionBoardItem_visionBoardId_order_idx" ON "VisionBoardItem"("visionBoardId", "order");

-- AddForeignKey
ALTER TABLE "VisionBoard" ADD CONSTRAINT "VisionBoard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionBoardItem" ADD CONSTRAINT "VisionBoardItem_visionBoardId_fkey" FOREIGN KEY ("visionBoardId") REFERENCES "VisionBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionBoardItem" ADD CONSTRAINT "VisionBoardItem_reflectionSessionId_fkey" FOREIGN KEY ("reflectionSessionId") REFERENCES "ReflectionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
