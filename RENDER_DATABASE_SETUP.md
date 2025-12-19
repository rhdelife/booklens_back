# Render 데이터베이스 설정 가이드

## DATABASE_URL 환경변수 설정

Supabase Connection String 형식:
```
postgresql://postgres.ueffydcywfasmxdiggym:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### Render에서 설정하기

1. Render 대시보드 접속
2. 서비스 선택 → **Environment** 탭
3. `DATABASE_URL` 환경변수 찾기 (또는 새로 추가)
4. 값 입력:
   ```
   postgresql://postgres.ueffydcywfasmxdiggym:실제비밀번호@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```
   ⚠️ `[YOUR-PASSWORD]` 부분을 **실제 비밀번호**로 교체하세요!
5. **Save Changes** 클릭
6. 자동으로 재배포됩니다

### Supabase 비밀번호 확인 방법

Supabase 대시보드:
- Project Settings → Database
- Database Password 섹션에서 확인
- 비밀번호를 모르면 "Reset Database Password" 클릭하여 새로 설정

### 주의사항

- 비밀번호에 특수문자가 포함되어 있으면 URL 인코딩이 필요할 수 있습니다
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- 등등

### 테스트

환경변수 설정 후:
1. 재배포 완료 대기 (약 1-2분)
2. `/api/health` 엔드포인트 테스트
3. Google OAuth 다시 시도

