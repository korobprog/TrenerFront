-- AlterTable
ALTER TABLE "InterviewAssistantSettings" ADD COLUMN     "openRouterApiKey" TEXT,
ADD COLUMN     "openRouterBaseUrl" TEXT DEFAULT 'https://openrouter.ai/api/v1',
ADD COLUMN     "openRouterMaxTokens" INTEGER DEFAULT 4000,
ADD COLUMN     "openRouterModel" TEXT DEFAULT 'google/gemma-3-12b-it:free',
ADD COLUMN     "openRouterTemperature" DOUBLE PRECISION DEFAULT 0.7;
