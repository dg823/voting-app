# 🗳️ 투표 앱

동아리처럼 작은 조직에서 질문 하나를 올리고, 구성원이 선택지를 골라 투표한 뒤 결과를 그래프로 확인하는 웹앱입니다.

- **제작:** 이동건
- **배포 주소:** https://voting-app-bice-xi.vercel.app
- **수업:** SDD 실습 4주차 (Matt Pocock's Skills: `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement` → `/code-review`)

## 주요 기능

| 기능 | 설명 |
|---|---|
| 투표하기 | 로그인 없이 선택지 하나를 골라 투표합니다. 같은 브라우저에서는 한 번만 투표할 수 있습니다. |
| **마감 시간 설정** | 투표를 만들 때 마감 시각을 정할 수 있습니다(선택). 화면에 남은 시간이 표시되고, 마감되면 버튼이 꺼지며 서버도 투표를 거부합니다. |
| **결과 그래프** | 선택지별 득표율(%)과 득표수를 가로 막대그래프로 보여주고, 최다 득표 선택지를 👑로 강조합니다. |
| **제작자 이름 표시** | 모든 화면의 헤더·푸터와 브라우저 탭 제목에 제작자 이름이 표시됩니다. |
| 관리자 | 관리자 비밀번호로 로그인한 사람만 투표를 만들고, 수정하고, 삭제할 수 있습니다. |

## 기술 스택

- Next.js 16 (App Router, Route Handlers) + TypeScript
- Tailwind CSS
- Neon Postgres (`@neondatabase/serverless`, ORM 없이 SQL 직접 사용)
- Vitest (테스트), Vercel (배포)

## 내 컴퓨터에서 실행하기

1. 패키지를 설치합니다.

   ```bash
   npm install
   ```

2. `.env.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.

   ```
   DATABASE_URL=postgresql://...   # Neon 연결 문자열
   ADMIN_PASSWORD=...              # 관리자 로그인 비밀번호
   SESSION_SECRET=...              # (선택) 비우면 관리자 비밀번호에서 자동 생성
   ```

3. Neon SQL Editor에서 [`db/schema.sql`](db/schema.sql)을 실행해 테이블을 만듭니다. 여러 번 실행해도 안전합니다.

4. 개발 서버를 켜고 http://localhost:3000 에 접속합니다.

   ```bash
   npm run dev
   ```

## 테스트

```bash
npm test          # 전체 테스트 (실제 Neon DB에 연결, 만든 데이터는 자동 삭제)
npm run typecheck # 타입 검사
npm run lint      # 린트
```

## 폴더 구조

```
app/                 화면(페이지)과 API
  api/polls/         투표 생성·조회·수정·삭제, 투표하기 API
  api/admin/         관리자 로그인·로그아웃 API
  polls/[id]/        투표하기, 결과, 수정 화면
components/          화면 조각 (투표 폼, 결과 그래프 등)
lib/                 핵심 로직 (DB 접근, 검증, 득표율 계산, 관리자 세션)
db/schema.sql        테이블 생성 SQL
CONTEXT.md           프로젝트 용어집
docs/adr/            중요한 설계 결정 기록 (ADR)
.scratch/            스펙과 티켓 문서
```

## 설계 결정 (ADR)

- [0001](docs/adr/0001-anonymous-voting-cookie-dedup.md): 로그인 없는 익명 투표와 쿠키 기반 중복 방지
- [0002](docs/adr/0002-closing-time-enforced-in-db.md): 마감 여부는 DB 시각 기준으로 서버에서 판정
- [0003](docs/adr/0003-raw-sql-no-orm-no-chart-lib.md): ORM·차트 라이브러리 없이 SQL과 직접 만든 막대그래프 사용
- [0004](docs/adr/0004-single-admin-password-signed-cookie.md): 공유 관리자 비밀번호와 서명된 쿠키 세션

## 알려진 한계

- 중복 투표는 쿠키로만 막기 때문에 다른 브라우저나 시크릿 창에서는 다시 투표할 수 있습니다.
- 관리자 계정은 비밀번호 하나를 함께 쓰며, 로그인 시도 횟수 제한은 없습니다.
- 결과 화면은 새로고침해야 최신 득표가 반영됩니다.
