-- CreateTable
CREATE TABLE "UserAuthSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enableEmailAuth" BOOLEAN NOT NULL DEFAULT true,
    "enableGoogleAuth" BOOLEAN NOT NULL DEFAULT true,
    "enableGithubAuth" BOOLEAN NOT NULL DEFAULT true,
    "enableCredentialsAuth" BOOLEAN NOT NULL DEFAULT true,
    "requireTwoFactor" BOOLEAN NOT NULL DEFAULT false,
    "sessionTimeout" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAuthSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAuthSettings_userId_key" ON "UserAuthSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserAuthSettings" ADD CONSTRAINT "UserAuthSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
