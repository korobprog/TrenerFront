-- CreateTable
CREATE TABLE "InterviewAssistantQA" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "tags" TEXT,
    "company" TEXT,
    "interviewDate" TIMESTAMP(3),

    CONSTRAINT "InterviewAssistantQA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAssistantCache" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewAssistantCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAssistantUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "questionsCount" INTEGER NOT NULL DEFAULT 0,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "apiCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "company" TEXT,
    "interviewDate" TIMESTAMP(3),

    CONSTRAINT "InterviewAssistantUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAssistantCompany" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewAssistantCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAssistantSettings" (
    "id" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "maxQuestionsPerDay" INTEGER NOT NULL DEFAULT 10,
    "maxTokensPerQuestion" INTEGER NOT NULL DEFAULT 4000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InterviewAssistantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewAssistantCompany_name_key" ON "InterviewAssistantCompany"("name");

-- AddForeignKey
ALTER TABLE "InterviewAssistantQA" ADD CONSTRAINT "InterviewAssistantQA_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAssistantUsage" ADD CONSTRAINT "InterviewAssistantUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
