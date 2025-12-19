-- Prisma User 테이블에 Google OAuth 필드 추가
-- Prisma는 "User" (따옴표 포함, 대문자)를 사용합니다

-- 1. googleId 컬럼 추가 (이미 있으면 무시)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;

-- 2. passwordHash를 nullable로 변경
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- 3. googleId에 unique 인덱스 추가 (NULL 값 제외)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'User' 
    AND indexname = 'User_googleId_key'
  ) THEN
    CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId") WHERE "googleId" IS NOT NULL;
  END IF;
END $$;

