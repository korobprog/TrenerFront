-- AlterTable
ALTER TABLE "InterviewAssistantSettings" ADD COLUMN     "apiType" TEXT NOT NULL DEFAULT 'anthropic',
ADD COLUMN     "langdockAssistantId" TEXT,
ADD COLUMN     "langdockBaseUrl" TEXT NOT NULL DEFAULT 'https://api.langdock.com/assistant/v1/chat/completions',
ADD COLUMN     "langdockRegion" TEXT NOT NULL DEFAULT 'eu';

-- AlterTable
ALTER TABLE "UserApiSettings" ADD COLUMN     "apiType" TEXT NOT NULL DEFAULT 'anthropic',
ADD COLUMN     "langdockApiKey" TEXT,
ADD COLUMN     "langdockAssistantId" TEXT,
ADD COLUMN     "langdockBaseUrl" TEXT;
