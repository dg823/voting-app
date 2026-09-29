# Spec: 투표 앱 MVP

**Status:** ready-for-agent

## Problem Statement

동아리 회장은 구성원에게 질문 하나를 올려 의견을 모으고 싶다. 지금은 단체 채팅방에서 손으로 세고 있어서 번거롭고, 결과를 한눈에 보기 어렵다.

## Solution

누구나 투표를 만들 수 있는 간단한 웹앱. 투표 생성자는 질문과 선택지 2~5개를 입력해 투표를 만든다. 투표자는 로그인 없이 선택지 하나를 골라 투표하고, 결과(선택지별 득표수)를 확인한다.

## User Stories

1. As a 투표 생성자, I want to 질문과 선택지를 입력해 투표를 만들고, so that 구성원에게 의견을 물을 수 있다
2. As a 투표 생성자, I want to 선택지를 2개 이상 5개 이하로만 만들 수 있도록 안내받고, so that 의미 없는 투표를 만들지 않는다
3. As a 투표 생성자, I want to 빈 질문이나 빈 선택지가 거부되고, so that 불완전한 투표가 올라가지 않는다
4. As a 투표 생성자, I want to 투표를 만든 직후 그 투표 페이지로 이동하고, so that 링크를 바로 공유할 수 있다
5. As a 투표자, I want to 첫 화면에서 전체 투표 목록을 최신순으로 보고, so that 참여할 투표를 고를 수 있다
6. As a 투표자, I want to 로그인 없이 투표하고, so that 부담 없이 참여할 수 있다
7. As a 투표자, I want to 선택지 하나를 골라 제출하고, so that 내 의견이 반영된다
8. As a 투표자, I want to 선택지를 고르지 않고는 제출할 수 없고, so that 실수로 빈 투표를 하지 않는다
9. As a 투표자, I want to 같은 투표에 두 번 투표하려 하면 결과 화면으로 안내받고, so that 결과가 왜곡되지 않는다
10. As a 투표자, I want to 투표 직후 결과 화면으로 이동하고, so that 현재 상황을 바로 볼 수 있다
11. As a 투표자, I want to 결과 화면에서 선택지별 득표수와 총 투표수를 보고, so that 어떤 선택지가 앞서는지 안다
12. As a 투표자, I want to 존재하지 않는 투표 주소에 들어가면 "찾을 수 없음" 화면을 보고, so that 잘못된 링크임을 안다

## Implementation Decisions

- Next.js App Router + Route Handlers + TypeScript, `@neondatabase/serverless`로 raw SQL(ADR-0003)
- Schema (이미 Neon에 있는 테이블과 호환):
  - `polls(id uuid pk, question text not null, created_at timestamptz default now())`
  - `options(id uuid pk, poll_id uuid fk → polls on delete cascade, label text not null, vote_count int default 0, position int default 0)`. `position`은 입력 순서 보존용
- 모든 DB 접근은 하나의 깊은 모듈("polls" 모듈)을 거친다: 투표 생성, 투표 조회, 목록 조회, 투표 행위 기록. 페이지·Route Handler는 이 모듈만 호출한다
- 입력 검증은 순수 함수로 분리해 클라이언트/서버가 같은 규칙을 쓴다(선택지 2~5개, 공백 제거 후 비어 있지 않음)
- API: `POST /api/polls`, `GET /api/polls/[id]`, `POST /api/polls/[id]/vote` (body: `optionId`)
- 중복 방지: 투표 행위 성공 시 투표별 쿠키(`voted_<pollId>`) 설정, 있으면 409(ADR-0001)
- 페이지: `/` 목록, `/new` 생성, `/polls/[id]` 투표하기, `/polls/[id]/results` 결과(숫자 리스트)

## Testing Decisions

- 좋은 테스트 = 공개 인터페이스로 관찰 가능한 동작만 검증. SQL이나 내부 구현을 검사하지 않는다
- **Seam 1 (주):** polls 모듈. 실제 Neon DB 대상 통합 테스트. 각 테스트는 자기가 만든 투표를 끝나고 삭제한다
- **Seam 2:** 입력 검증 순수 함수 단위 테스트
- 도구: Vitest. 기존 선례 없음(새 프로젝트)

## Out of Scope

- 마감 시간, 결과 그래프(→ 부록 기능 추가), 로그인·운영자 권한, 투표 삭제/수정, 복수 선택, 실시간 갱신

## Further Notes

- `.env.local`의 `DATABASE_URL` 사용. 테스트도 같은 DB를 쓰므로 반드시 정리(cleanup)한다
