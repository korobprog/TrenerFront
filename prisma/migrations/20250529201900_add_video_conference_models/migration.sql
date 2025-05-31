-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "audioEnabled" BOOLEAN NOT NULL DEFAULT true,
    "screenShareEnabled" BOOLEAN NOT NULL DEFAULT true,
    "preferredVideoQuality" TEXT NOT NULL DEFAULT '720p',
    "preferredAudioQuality" TEXT NOT NULL DEFAULT 'high',
    "autoJoinAudio" BOOLEAN NOT NULL DEFAULT true,
    "autoJoinVideo" BOOLEAN NOT NULL DEFAULT false,
    "backgroundBlur" BOOLEAN NOT NULL DEFAULT false,
    "virtualBackground" TEXT,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hostId" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "maxParticipants" INTEGER NOT NULL DEFAULT 10,
    "scheduledStartTime" TIMESTAMP(3),
    "scheduledEndTime" TIMESTAMP(3),
    "actualStartTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recordingUrl" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomCalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "eventType" TEXT NOT NULL DEFAULT 'meeting',
    "videoRoomId" TEXT,
    "organizerId" TEXT NOT NULL,
    "attendeeIds" JSONB,
    "meetingLink" TEXT,
    "reminderMinutes" INTEGER DEFAULT 15,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoRoomParticipant" (
    "id" TEXT NOT NULL,
    "videoRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'participant',
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "isVideoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isAudioEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isScreenSharing" BOOLEAN NOT NULL DEFAULT false,
    "connectionQuality" TEXT,
    "totalDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoRoomParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoRoom_roomCode_key" ON "VideoRoom"("roomCode");

-- CreateIndex
CREATE UNIQUE INDEX "VideoRoomParticipant_videoRoomId_userId_key" ON "VideoRoomParticipant"("videoRoomId", "userId");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRoom" ADD CONSTRAINT "VideoRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomCalendarEvent" ADD CONSTRAINT "CustomCalendarEvent_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomCalendarEvent" ADD CONSTRAINT "CustomCalendarEvent_videoRoomId_fkey" FOREIGN KEY ("videoRoomId") REFERENCES "VideoRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRoomParticipant" ADD CONSTRAINT "VideoRoomParticipant_videoRoomId_fkey" FOREIGN KEY ("videoRoomId") REFERENCES "VideoRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRoomParticipant" ADD CONSTRAINT "VideoRoomParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
