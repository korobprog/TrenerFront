-- AlterTable
ALTER TABLE "VideoRoom" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "settings" JSONB;
