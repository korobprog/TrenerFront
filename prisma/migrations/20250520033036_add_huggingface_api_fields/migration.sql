-- Добавление полей для Hugging Face API в таблицу UserApiSettings
ALTER TABLE "UserApiSettings" ADD COLUMN IF NOT EXISTS "huggingfaceApiKey" TEXT;
ALTER TABLE "UserApiSettings" ADD COLUMN IF NOT EXISTS "huggingfaceModel" TEXT;
ALTER TABLE "UserApiSettings" ADD COLUMN IF NOT EXISTS "huggingfaceBaseUrl" TEXT;
ALTER TABLE "UserApiSettings" ADD COLUMN IF NOT EXISTS "huggingfaceTemperature" DOUBLE PRECISION;
ALTER TABLE "UserApiSettings" ADD COLUMN IF NOT EXISTS "huggingfaceMaxTokens" INTEGER;