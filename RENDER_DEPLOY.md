# Render 배포 가이드

## Render 서비스 설정

### 1. Build & Start Commands

**Build Command:**
```bash
npm run build
```
(이제 `prisma generate`가 포함되어 있음)

**Start Command:**
```bash
npm start
```

### 2. 환경변수

다음 환경변수들을 모두 설정해야 합니다:

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=sk-...
FRONTEND_URL=https://your-vercel-domain.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-render-url.onrender.com/api/auth/google/callback
```

### 3. Prisma 마이그레이션

프로덕션 배포 전에 Prisma 마이그레이션을 실행해야 합니다.

**옵션 1: Render에서 자동 실행 (권장)**

Render 서비스 설정에서 **"Run Prisma Migrations"** 옵션을 활성화하거나, Build Command를 다음과 같이 변경:

```bash
npm run build && npx prisma migrate deploy
```

**옵션 2: 수동 실행**

배포 후 Render 서비스의 Shell에서:
```bash
npx prisma migrate deploy
```

### 4. 일반적인 배포 실패 원인

1. **Prisma 클라이언트 미생성**
   - ✅ 해결: `package.json`의 `build` 스크립트에 `prisma generate` 추가됨

2. **환경변수 누락**
   - ✅ 해결: 모든 필수 환경변수 확인

3. **TypeScript 컴파일 에러**
   - 로그에서 확인: `npm run build` 실행 시 에러 확인

4. **포트 설정**
   - Render는 자동으로 `PORT` 환경변수를 설정하므로 코드에서 `process.env.PORT` 사용 확인

5. **데이터베이스 연결 실패**
   - `DATABASE_URL` 확인
   - Supabase 연결 문자열 형식 확인

### 5. 배포 로그 확인

Render 대시보드 → Logs에서 다음을 확인:
- Build 로그: `npm run build` 성공 여부
- Runtime 로그: 서버 시작 시 에러 확인

### 6. 디버깅 팁

배포 실패 시:
1. Logs 탭에서 에러 메시지 확인
2. Build Command가 올바른지 확인
3. 환경변수가 모두 설정되었는지 확인
4. Prisma 마이그레이션이 실행되었는지 확인

