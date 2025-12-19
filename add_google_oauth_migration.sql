-- Add googleId column to User table
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;

-- Make passwordHash nullable
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Create unique index for googleId
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId") WHERE "googleId" IS NOT NULL;

