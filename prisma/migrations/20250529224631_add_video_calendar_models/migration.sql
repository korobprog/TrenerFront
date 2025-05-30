/*
  Warnings:

  - You are about to drop the column `attendeeIds` on the `CustomCalendarEvent` table. All the data in the column will be lost.
  - You are about to drop the column `isAllDay` on the `CustomCalendarEvent` table. All the data in the column will be lost.
  - You are about to drop the column `meetingLink` on the `CustomCalendarEvent` table. All the data in the column will be lost.
  - You are about to drop the column `organizerId` on the `CustomCalendarEvent` table. All the data in the column will be lost.
  - You are about to drop the column `recurrenceRule` on the `CustomCalendarEvent` table. All the data in the column will be lost.
  - You are about to drop the column `reminderMinutes` on the `CustomCalendarEvent` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `CustomCalendarEvent` table. All the data in the column will be lost.
  - You are about to drop the column `audioEnabled` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `autoJoinAudio` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `autoJoinVideo` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `backgroundBlur` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `notificationsEnabled` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `preferredAudioQuality` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `preferredVideoQuality` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `screenShareEnabled` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `videoEnabled` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `virtualBackground` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `actualEndTime` on the `VideoRoom` table. All the data in the column will be lost.
  - You are about to drop the column `actualStartTime` on the `VideoRoom` table. All the data in the column will be lost.
  - You are about to drop the column `isPrivate` on the `VideoRoom` table. All the data in the column will be lost.
  - You are about to drop the column `recordingEnabled` on the `VideoRoom` table. All the data in the column will be lost.
  - You are about to drop the column `recordingUrl` on the `VideoRoom` table. All the data in the column will be lost.
  - You are about to drop the column `roomCode` on the `VideoRoom` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledEndTime` on the `VideoRoom` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledStartTime` on the `VideoRoom` table. All the data in the column will be lost.
  - You are about to drop the column `settings` on the `VideoRoom` table. All the data in the column will be lost.
  - You are about to drop the column `connectionQuality` on the `VideoRoomParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `VideoRoomParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `isAudioEnabled` on the `VideoRoomParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `isScreenSharing` on the `VideoRoomParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `isVideoEnabled` on the `VideoRoomParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `totalDuration` on the `VideoRoomParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `VideoRoomParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `videoRoomId` on the `VideoRoomParticipant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `VideoRoom` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[roomId,userId]` on the table `VideoRoomParticipant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `CustomCalendarEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `VideoRoom` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomId` to the `VideoRoomParticipant` table without a default value. This is not possible if the table is not empty.
  - Made the column `joinedAt` on table `VideoRoomParticipant` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CustomCalendarEvent" DROP CONSTRAINT "CustomCalendarEvent_organizerId_fkey";

-- DropForeignKey
ALTER TABLE "UserPreferences" DROP CONSTRAINT "UserPreferences_userId_fkey";

-- DropForeignKey
ALTER TABLE "VideoRoom" DROP CONSTRAINT "VideoRoom_hostId_fkey";

-- DropForeignKey
ALTER TABLE "VideoRoomParticipant" DROP CONSTRAINT "VideoRoomParticipant_userId_fkey";

-- DropForeignKey
ALTER TABLE "VideoRoomParticipant" DROP CONSTRAINT "VideoRoomParticipant_videoRoomId_fkey";

-- DropIndex
DROP INDEX "VideoRoom_roomCode_key";

-- DropIndex
DROP INDEX "VideoRoomParticipant_videoRoomId_userId_key";

-- AlterTable
ALTER TABLE "CustomCalendarEvent" DROP COLUMN "attendeeIds",
DROP COLUMN "isAllDay",
DROP COLUMN "meetingLink",
DROP COLUMN "organizerId",
DROP COLUMN "recurrenceRule",
DROP COLUMN "reminderMinutes",
DROP COLUMN "status",
ADD COLUMN     "mockInterviewId" TEXT,
ADD COLUMN     "recurringEndDate" TIMESTAMP(3),
ADD COLUMN     "recurringPattern" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MockInterview" ADD COLUMN     "videoRoomId" TEXT,
ADD COLUMN     "videoType" TEXT DEFAULT 'google_meet';

-- AlterTable
ALTER TABLE "UserPreferences" DROP COLUMN "audioEnabled",
DROP COLUMN "autoJoinAudio",
DROP COLUMN "autoJoinVideo",
DROP COLUMN "backgroundBlur",
DROP COLUMN "notificationsEnabled",
DROP COLUMN "preferredAudioQuality",
DROP COLUMN "preferredVideoQuality",
DROP COLUMN "screenShareEnabled",
DROP COLUMN "videoEnabled",
DROP COLUMN "virtualBackground",
ADD COLUMN     "defaultCalendarView" TEXT NOT NULL DEFAULT 'month',
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminderMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
ADD COLUMN     "workingHoursEnd" INTEGER NOT NULL DEFAULT 18,
ADD COLUMN     "workingHoursStart" INTEGER NOT NULL DEFAULT 9;

-- AlterTable
ALTER TABLE "VideoRoom" DROP COLUMN "actualEndTime",
DROP COLUMN "actualStartTime",
DROP COLUMN "isPrivate",
DROP COLUMN "recordingEnabled",
DROP COLUMN "recordingUrl",
DROP COLUMN "roomCode",
DROP COLUMN "scheduledEndTime",
DROP COLUMN "scheduledStartTime",
DROP COLUMN "settings",
ADD COLUMN     "actualEnd" TIMESTAMP(3),
ADD COLUMN     "actualStart" TIMESTAMP(3),
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "requiresPassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduledEnd" TIMESTAMP(3),
ADD COLUMN     "scheduledStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VideoRoomParticipant" DROP COLUMN "connectionQuality",
DROP COLUMN "createdAt",
DROP COLUMN "isAudioEnabled",
DROP COLUMN "isScreenSharing",
DROP COLUMN "isVideoEnabled",
DROP COLUMN "totalDuration",
DROP COLUMN "updatedAt",
DROP COLUMN "videoRoomId",
ADD COLUMN     "audioEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "roomId" TEXT NOT NULL,
ADD COLUMN     "screenSharing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'joined',
ADD COLUMN     "videoEnabled" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "joinedAt" SET NOT NULL,
ALTER COLUMN "joinedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "VideoRoomChatMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT,
    "message" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "guestName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoRoomChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoRoomChatMessage_roomId_createdAt_idx" ON "VideoRoomChatMessage"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoRoomChatMessage_userId_idx" ON "VideoRoomChatMessage"("userId");

-- CreateIndex
CREATE INDEX "NotificationSubscription_userId_idx" ON "NotificationSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSubscription_userId_endpoint_key" ON "NotificationSubscription"("userId", "endpoint");

-- CreateIndex
CREATE INDEX "CustomCalendarEvent_userId_startTime_idx" ON "CustomCalendarEvent"("userId", "startTime");

-- CreateIndex
CREATE INDEX "CustomCalendarEvent_eventType_idx" ON "CustomCalendarEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "VideoRoom_code_key" ON "VideoRoom"("code");

-- CreateIndex
CREATE INDEX "VideoRoom_code_idx" ON "VideoRoom"("code");

-- CreateIndex
CREATE INDEX "VideoRoom_hostId_idx" ON "VideoRoom"("hostId");

-- CreateIndex
CREATE INDEX "VideoRoom_isActive_idx" ON "VideoRoom"("isActive");

-- CreateIndex
CREATE INDEX "VideoRoomParticipant_roomId_idx" ON "VideoRoomParticipant"("roomId");

-- CreateIndex
CREATE INDEX "VideoRoomParticipant_userId_idx" ON "VideoRoomParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoRoomParticipant_roomId_userId_key" ON "VideoRoomParticipant"("roomId", "userId");

-- AddForeignKey
ALTER TABLE "MockInterview" ADD CONSTRAINT "MockInterview_videoRoomId_fkey" FOREIGN KEY ("videoRoomId") REFERENCES "VideoRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomCalendarEvent" ADD CONSTRAINT "CustomCalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomCalendarEvent" ADD CONSTRAINT "CustomCalendarEvent_mockInterviewId_fkey" FOREIGN KEY ("mockInterviewId") REFERENCES "MockInterview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRoom" ADD CONSTRAINT "VideoRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRoomParticipant" ADD CONSTRAINT "VideoRoomParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "VideoRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRoomParticipant" ADD CONSTRAINT "VideoRoomParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRoomChatMessage" ADD CONSTRAINT "VideoRoomChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "VideoRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRoomChatMessage" ADD CONSTRAINT "VideoRoomChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSubscription" ADD CONSTRAINT "NotificationSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
