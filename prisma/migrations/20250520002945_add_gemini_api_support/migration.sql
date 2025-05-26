-- AlterTable
ALTER TABLE "InterviewAssistantSettings" ADD COLUMN     "geminiApiKey" TEXT,
ADD COLUMN     "geminiBaseUrl" TEXT NOT NULL DEFAULT 'https://generativelanguage.googleapis.com',
ADD COLUMN     "geminiModel" TEXT NOT NULL DEFAULT 'gemini-1.5-pro',
ADD COLUMN     "geminiTemperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
ALTER COLUMN "apiType" SET DEFAULT 'gemini';

-- AlterTable
ALTER TABLE "UserApiSettings" ADD COLUMN     "geminiApiKey" TEXT,
ADD COLUMN     "geminiBaseUrl" TEXT,
ADD COLUMN     "geminiModel" TEXT,
ADD COLUMN     "geminiTemperature" DOUBLE PRECISION,
ALTER COLUMN "apiType" SET DEFAULT 'gemini';
