-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "answer" TEXT,
ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "estimatedTime" INTEGER,
ADD COLUMN     "options" JSONB,
ADD COLUMN     "question" TEXT,
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "topic" TEXT;

-- AlterTable
ALTER TABLE "UserProgress" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isCorrect" BOOLEAN,
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timeSpent" INTEGER;

-- CreateTable
CREATE TABLE "UserFavoriteQuestion" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserFavoriteQuestion_userId_questionId_key" ON "UserFavoriteQuestion"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "UserFavoriteQuestion" ADD CONSTRAINT "UserFavoriteQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteQuestion" ADD CONSTRAINT "UserFavoriteQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
