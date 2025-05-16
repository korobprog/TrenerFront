-- Ожидаемый SQL-код миграции для моделей мок-собеседований
-- Этот файл содержит примерный SQL-код, который должен быть сгенерирован при создании миграции
-- Фактический код может отличаться в зависимости от состояния базы данных и настроек Prisma

-- CreateTable: UserPoints
CREATE TABLE "UserPoints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MockInterview
CREATE TABLE "MockInterview" (
    "id" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "intervieweeId" TEXT,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "meetingLink" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InterviewFeedback
CREATE TABLE "InterviewFeedback" (
    "id" TEXT NOT NULL,
    "mockInterviewId" TEXT NOT NULL,
    "technicalScore" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint on UserPoints.userId
CREATE UNIQUE INDEX "UserPoints_userId_key" ON "UserPoints"("userId");

-- CreateIndex: Unique constraint on InterviewFeedback.mockInterviewId
CREATE UNIQUE INDEX "InterviewFeedback_mockInterviewId_key" ON "InterviewFeedback"("mockInterviewId");

-- AddForeignKey: UserPoints.userId -> User.id
ALTER TABLE "UserPoints" ADD CONSTRAINT "UserPoints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: MockInterview.interviewerId -> User.id
ALTER TABLE "MockInterview" ADD CONSTRAINT "MockInterview_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: MockInterview.intervieweeId -> User.id
ALTER TABLE "MockInterview" ADD CONSTRAINT "MockInterview_intervieweeId_fkey" FOREIGN KEY ("intervieweeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: InterviewFeedback.mockInterviewId -> MockInterview.id
ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_mockInterviewId_fkey" FOREIGN KEY ("mockInterviewId") REFERENCES "MockInterview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;