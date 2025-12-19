# BookLens TypeScript Backend

Node.js + TypeScript + Express + Prisma 기반 BookLens 백엔드입니다.  
프론트엔드(`booklens-aa`)에서 사용하는 API 스펙에 맞춰 구현되었습니다.

## 1. 기술 스택

- **Runtime**: Node.js (LTS)
- **Language**: TypeScript
- **Framework**: Express
- **DB**: PostgreSQL + Prisma
- **Auth**: JWT (`Authorization: Bearer <token>`)
- **AI**: OpenAI (gpt-4.1-mini)

## 2. 프로젝트 구조

```text
ts-backend/
  prisma/
    schema.prisma
  src/
    app.ts                # Express 앱
    server.ts             # 서버 시작
    lib/
      prisma.ts           # PrismaClient
      openai.ts           # OpenAI 클라이언트
    middleware/
      auth.ts             # JWT 인증 미들웨어
      errorHandler.ts     # 공통 에러 핸들러
    routes/
      auth.ts             # /api/auth/*
      books.ts            # /api/books/*
      postings.ts         # /api/postings/*
      ai.ts               # /api/ai/recommendations
    services/
      authService.ts
      bookService.ts
      postingService.ts
      aiService.ts
  package.json
  tsconfig.json
  README.md
```

## 3. 환경 변수 설정

프로젝트 루트(`ts-backend`)에 `.env` 파일을 생성하세요:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/booklens
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=sk-...
PORT=3000
FRONTEND_URL=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## 4. 설치 및 실행

```bash
cd ts-backend

# 패키지 설치
npm install

# Prisma 클라이언트 생성
npx prisma generate

# DB 마이그레이션 (개발용)
npx prisma migrate dev --name init

# 개발 서버
npm run dev

# 또는 빌드 후 실행
npm run build
npm start
```

서버가 실행되면:

- Health check: `GET http://localhost:3000/api/health`
- API Base: `http://localhost:3000/api`

## 5. 주요 API

### 5-1. 인증 (/api/auth)

#### POST /api/auth/signup

Request JSON:

```json
{
  "email": "test@example.com",
  "password": "password123",
  "name": "홍길동"
}
```

Response JSON:

```json
{
  "user": {
    "id": 1,
    "email": "test@example.com",
    "name": "홍길동",
    "nickname": null,
    "alias": null,
    "bio": null,
    "profile_image_url": null
  },
  "token": "JWT 토큰"
}
```

#### POST /api/auth/login

Body / 응답 형식은 `signup`과 동일합니다.

#### GET /api/auth/me

Headers:

```http
Authorization: Bearer <token>
```

Response:

```json
{
  "user": {
    "id": 1,
    "email": "test@example.com",
    "name": "홍길동",
    "nickname": null,
    "alias": null,
    "bio": null,
    "profile_image_url": null
  }
}
```

#### PUT /api/auth/profile

```json
{
  "name": "새 이름",
  "nickname": "닉네임",
  "alias": "별칭",
  "bio": "자기소개"
}
```

#### POST /api/auth/profile/image

```json
{
  "profile_image_url": "https://example.com/image.png"
}
```

#### GET /api/auth/google

Google OAuth 로그인을 시작합니다. Google 인증 페이지로 리다이렉트됩니다.

#### GET /api/auth/google/callback

Google OAuth 콜백 엔드포인트입니다. Google 인증 후 자동으로 호출되며, 프론트엔드로 리다이렉트되면서 토큰이 전달됩니다.

**Response**: 프론트엔드로 리다이렉트
```
http://your-frontend-url/auth/callback?token=JWT_TOKEN&user={...}
```

### 5-2. 책 / 독서 (/api/books)

#### GET /api/books

Headers:

```http
Authorization: Bearer <token>
```

Response:

```json
[
  {
    "id": 1,
    "user_id": 1,
    "title": "책 제목",
    "author": "저자",
    "publisher": "출판사",
    "publish_date": "2020-01-01",
    "total_page": 300,
    "read_page": 50,
    "progress": 16.67,
    "status": "reading",
    "start_date": "2025-01-01",
    "completed_date": null,
    "total_reading_time": 3600,
    "memo": "메모",
    "thumbnail": "https://...",
    "isbn": "978..."
  }
]
```

#### POST /api/books

```json
{
  "title": "책 제목",
  "author": "저자",
  "publisher": "출판사",
  "publish_date": "2020-01-01",
  "total_page": 300,
  "read_page": 0,
  "status": "not_started",
  "start_date": null,
  "completed_date": null,
  "memo": null,
  "thumbnail": null,
  "isbn": "978..."
}
```

### 5-3. 포스팅 / 좋아요 / 댓글 (/api/postings)

- `GET /api/postings`
- `POST /api/postings`
- `GET /api/postings/:id`
- `PUT /api/postings/:id`
- `DELETE /api/postings/:id`
- `POST /api/postings/:id/like`
- `POST /api/postings/:id/comments`
- `DELETE /api/comments/:id`

기본적인 게시판/댓글/좋아요 패턴으로 구현되어 있으며, 응답에는 작성자/책 정보가 함께 포함됩니다.

## 6. AI 도서 추천 API

### 6-1. 엔드포인트

`POST /api/ai/recommendations`

### 6-2. Request Body

```json
{
  "inputType": "isbn",
  "query": "9781234567890",
  "userContext": {
    "recentBooks": [
      { "title": "최근 읽은 책", "author": "저자", "genre": "소설", "rating": 4 }
    ],
    "preferredGenres": ["소설", "에세이"],
    "readingGoal": "한 달에 3권 읽기"
  }
}
```

### 6-3. Response Body

```json
{
  "seed": {
    "title": "기준 도서 제목 또는 null",
    "author": "저자 또는 null",
    "genre": null,
    "isbn13": "요청한 ISBN 또는 null"
  },
  "items": [
    {
      "title": "추천 도서 제목",
      "author": "저자",
      "genre": "장르",
      "reason": "한국어로 1-2문장 추천 이유",
      "keywords": ["키워드1", "키워드2"]
    }
  ]
}
```

### 6-4. 검증 및 에러 처리

- Request:
  - `inputType`은 `"isbn"` 또는 `"title"`
  - `query`는 빈 문자열이면 안 됨
  - `userContext.recentBooks[].rating`이 있다면 1~5 범위
- Response (OpenAI 응답):
  - Zod 스키마로 검증
  - 실패 시:

```json
{
  "seed": { "title": "... 또는 null", "author": null, "genre": null, "isbn13": "... 또는 null" },
  "items": []
}
```

- OpenAI 에러:

```json
{
  "error": "Failed to generate recommendations"
}
```

## 7. 샘플 curl

```bash
# 회원가입
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"홍길동"}'

# 로그인
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# AI 추천
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "inputType": "title",
    "query": "해리 포터",
    "userContext": {
      "recentBooks": [],
      "preferredGenres": ["판타지"],
      "readingGoal": "재미있게 읽을 수 있는 판타지 소설"
    }
  }'
```


