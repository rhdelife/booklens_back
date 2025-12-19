-- Prisma가 생성한 User 테이블에 googleId가 있는지 확인하는 SQL

-- 1. User 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'User'
ORDER BY ordinal_position;

-- 2. googleId 컬럼이 있는지 확인
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'User' AND column_name = 'googleId'
) AS has_google_id;

-- 3. passwordHash가 nullable인지 확인
SELECT is_nullable
FROM information_schema.columns
WHERE table_name = 'User' AND column_name = 'passwordHash';

