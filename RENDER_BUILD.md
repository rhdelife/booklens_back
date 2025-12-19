# Render 빌드 설정 가이드

## 문제 해결

Render에서 빌드 실패 시 확인 사항:

### 1. Build Command 설정 (중요!)

Render 서비스 설정에서 **Build Command**를 다음으로 설정:

```bash
npm install && npm run build
```

**중요**: `npm install`을 명시적으로 포함해야 `devDependencies` (TypeScript, Prisma 등)가 설치됩니다.
Render의 기본 `npm install`은 프로덕션 모드로 실행되어 `devDependencies`를 설치하지 않을 수 있습니다.

### 2. Start Command

```bash
npm start
```

### 3. 중요: postinstall 스크립트

`package.json`에 `postinstall` 스크립트가 있어야 합니다:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

이렇게 하면 `npm install` 후 자동으로 Prisma 클라이언트가 생성됩니다.

### 4. Prisma 마이그레이션

프로덕션 배포 시 Build Command에 마이그레이션 추가:

```bash
npm run build && npx prisma migrate deploy
```

또는 Render 서비스 설정에서 "Run Prisma Migrations" 옵션 활성화

### 5. 일반적인 문제

#### 문제: 모듈을 찾을 수 없음
- **원인**: `npm install`이 제대로 실행되지 않음
- **해결**: Build Command에 `npm install` 명시적으로 추가

#### 문제: Prisma 클라이언트 생성 실패
- **원인**: `postinstall` 스크립트가 실행되지 않음
- **해결**: `package.json`에 `postinstall` 스크립트 확인

#### 문제: TypeScript 컴파일 에러
- **원인**: 타입 정의 누락 또는 타입 에러
- **해결**: 타입 에러 수정, `@types/node` 설치 확인

