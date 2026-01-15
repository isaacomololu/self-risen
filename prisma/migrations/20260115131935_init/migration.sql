-- CreateTable
CREATE TABLE "StreakHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "streak" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreakHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StreakHistory_userId_idx" ON "StreakHistory"("userId");

-- CreateIndex
CREATE INDEX "StreakHistory_userId_date_idx" ON "StreakHistory"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StreakHistory_userId_date_key" ON "StreakHistory"("userId", "date");

-- AddForeignKey
ALTER TABLE "StreakHistory" ADD CONSTRAINT "StreakHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
