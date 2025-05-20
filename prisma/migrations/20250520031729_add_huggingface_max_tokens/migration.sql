-- AlterTable
ALTER TABLE "InterviewAssistantSettings" ADD COLUMN     "enabledModels" TEXT NOT NULL DEFAULT 'gemini,anthropic,langdock,huggingface',
ADD COLUMN     "huggingfaceApiKey" TEXT,
ADD COLUMN     "huggingfaceBaseUrl" TEXT NOT NULL DEFAULT 'https://api-inference.huggingface.co/models',
ADD COLUMN     "huggingfaceMaxTokens" INTEGER NOT NULL DEFAULT 2000,
ADD COLUMN     "huggingfaceModel" TEXT NOT NULL DEFAULT 'mistralai/Mistral-7B-Instruct-v0.2',
ADD COLUMN     "huggingfaceTemperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7;

-- AlterTable
ALTER TABLE "UserApiSettings" ADD COLUMN     "huggingfaceApiKey" TEXT,
ADD COLUMN     "huggingfaceBaseUrl" TEXT,
ADD COLUMN     "huggingfaceMaxTokens" INTEGER,
ADD COLUMN     "huggingfaceModel" TEXT,
ADD COLUMN     "huggingfaceTemperature" DOUBLE PRECISION,
ADD COLUMN     "selectedModel" TEXT;
