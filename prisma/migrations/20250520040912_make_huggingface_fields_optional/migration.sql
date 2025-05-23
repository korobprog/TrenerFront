-- AlterTable
ALTER TABLE "UserApiSettings" ALTER COLUMN "huggingfaceBaseUrl" SET DEFAULT 'https://api-inference.huggingface.co/models',
ALTER COLUMN "huggingfaceMaxTokens" SET DEFAULT 100,
ALTER COLUMN "huggingfaceModel" SET DEFAULT 'distilgpt2',
ALTER COLUMN "huggingfaceTemperature" SET DEFAULT 0.7;
