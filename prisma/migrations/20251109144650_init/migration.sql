-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "avatar" TEXT,
    "fcmTokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastLoggedInAt" TIMESTAMP(3),
    "lastLoggedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channels" "NotificationChannelType"[],
    "generatedByUserId" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "estateId" TEXT,
    "iconUrl" TEXT,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "deepLink" TEXT,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationAuditLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "channel" "NotificationChannelType" NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "error" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDeadLetterQueue" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT,
    "channel" "NotificationChannelType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "lastError" TEXT NOT NULL,
    "jobData" JSONB NOT NULL DEFAULT '{}',
    "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDeadLetterQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseId_key" ON "User"("firebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_requestId_key" ON "Notification"("requestId");

-- CreateIndex
CREATE INDEX "Notification_requestId_idx" ON "Notification"("requestId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_generatedByUserId_idx" ON "Notification"("generatedByUserId");

-- CreateIndex
CREATE INDEX "NotificationRecipient_recipientId_isRead_idx" ON "NotificationRecipient"("recipientId", "isRead");

-- CreateIndex
CREATE INDEX "NotificationRecipient_recipientId_createdAt_idx" ON "NotificationRecipient"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationRecipient_notificationId_idx" ON "NotificationRecipient"("notificationId");

-- CreateIndex
CREATE INDEX "NotificationAuditLog_recipientId_notificationType_createdAt_idx" ON "NotificationAuditLog"("recipientId", "notificationType", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationAuditLog_requestId_channel_idx" ON "NotificationAuditLog"("requestId", "channel");

-- CreateIndex
CREATE INDEX "NotificationAuditLog_status_createdAt_idx" ON "NotificationAuditLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationAuditLog_recipientId_createdAt_idx" ON "NotificationAuditLog"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDeadLetterQueue_requestId_idx" ON "NotificationDeadLetterQueue"("requestId");

-- CreateIndex
CREATE INDEX "NotificationDeadLetterQueue_userId_idx" ON "NotificationDeadLetterQueue"("userId");

-- CreateIndex
CREATE INDEX "NotificationDeadLetterQueue_failedAt_idx" ON "NotificationDeadLetterQueue"("failedAt");

-- CreateIndex
CREATE INDEX "NotificationDeadLetterQueue_notificationId_idx" ON "NotificationDeadLetterQueue"("notificationId");

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
