-- CreateTable
CREATE TABLE "WheelOfLife" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WheelOfLife_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheelCategory" (
    "id" TEXT NOT NULL,
    "wheelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WheelCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheelAssessment" (
    "id" TEXT NOT NULL,
    "wheelId" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "strongestArea" TEXT,
    "weakestArea" TEXT,
    "imbalanceScore" DOUBLE PRECISION,
    "focusCategoryId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WheelAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WheelOfLife_userId_key" ON "WheelOfLife"("userId");

-- CreateIndex
CREATE INDEX "WheelOfLife_userId_idx" ON "WheelOfLife"("userId");

-- CreateIndex
CREATE INDEX "WheelCategory_wheelId_idx" ON "WheelCategory"("wheelId");

-- CreateIndex
CREATE INDEX "WheelAssessment_wheelId_idx" ON "WheelAssessment"("wheelId");

-- CreateIndex
CREATE INDEX "WheelAssessment_wheelId_createdAt_idx" ON "WheelAssessment"("wheelId", "createdAt");

-- AddForeignKey
ALTER TABLE "WheelOfLife" ADD CONSTRAINT "WheelOfLife_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelCategory" ADD CONSTRAINT "WheelCategory_wheelId_fkey" FOREIGN KEY ("wheelId") REFERENCES "WheelOfLife"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelAssessment" ADD CONSTRAINT "WheelAssessment_wheelId_fkey" FOREIGN KEY ("wheelId") REFERENCES "WheelOfLife"("id") ON DELETE CASCADE ON UPDATE CASCADE;
