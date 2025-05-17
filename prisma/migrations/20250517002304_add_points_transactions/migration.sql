-- AlterTable
ALTER TABLE "InterviewFeedback" ADD COLUMN     "interviewerRating" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "conductedInterviewsCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UserViolation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserViolation" ADD CONSTRAINT "UserViolation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
