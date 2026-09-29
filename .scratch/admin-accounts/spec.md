# Spec: 관리자 계정 + 투표 관리(생성·수정·삭제)

**Status:** ready-for-agent

## Problem Statement

지금은 누구나 투표를 만들 수 있고, 오타가 있거나 필요 없어진 투표를 고치거나 지울 방법이 없다. 동아리 회장은 운영진만 투표를 관리하길 원한다.

## Solution

관리자 비밀번호로 로그인한 관리자만 투표를 만들고, 수정하고, 삭제할 수 있다. 투표자는 기존처럼 로그인 없이 투표하고 결과를 본다.

## User Stories

1. As a 관리자, I want to 관리자 비밀번호로 로그인하고, so that 투표를 관리할 수 있다
2. As a 관리자, I want to 비밀번호가 틀리면 오류 안내를 보고, so that 다시 시도할 수 있다
3. As a 관리자, I want to 로그인이 1일 동안 유지되고, so that 매번 로그인하지 않는다
4. As a 관리자, I want to 로그아웃하고, so that 공용 컴퓨터에서 안전하게 떠난다
5. As a 관리자, I want to 로그인한 상태에서만 "새 투표 만들기"를 보고, so that 투표를 만든다
6. As a 관리자, I want to 투표의 질문, 선택지 이름, 마감 시각을 수정하고, so that 오타나 일정 변경을 반영한다
7. As a 관리자, I want to 마감 시각을 지우거나 미래로 바꿔 마감된 투표를 다시 열고, so that 기간을 연장한다
8. As a 관리자, I want to 확인 후 투표를 삭제하고, so that 필요 없는 투표를 없앤다(선택지·득표도 함께 삭제)
9. As a 투표자, I want to 로그인 없이 기존처럼 투표하고 결과를 보고, so that 참여가 쉽다
10. As a 투표자, I want to 관리 버튼을 보지 않고, so that 화면이 헷갈리지 않는다
11. As a 관리자가 아닌 사람, I want to 관리 화면 주소로 들어가면 로그인 화면으로 안내받고, so that 권한이 필요함을 안다
12. As a 공격자, I cannot 관리 API를 직접 호출해 투표를 만들거나 바꾸거나 지울 수 없다(401)

## Implementation Decisions

- ADR-0004: `ADMIN_PASSWORD` 공유 비밀번호 + `SESSION_SECRET` HMAC 서명 쿠키(1일, httpOnly, sameSite=lax)
- 세션 모듈(순수 함수): 토큰 발급, 토큰 검증(서명·만료), 비밀번호 비교(타이밍 안전)
- 인증 모듈(서버 전용): 현재 요청이 관리자인지, 관리자 아니면 로그인으로 보내기, 쿠키 설정/삭제
- API: `POST /api/admin/login`, `POST /api/admin/logout`, `POST /api/polls`(관리자), `PATCH /api/polls/[id]`(관리자), `DELETE /api/polls/[id]`(관리자)
- 수정 범위: 질문, 기존 선택지 이름, 마감 시각. 생성 후 선택지 개수는 바꾸지 않는다(득표 보존)
- 수정 시 마감 시각은 비우거나(무기한) 미래만 허용(생성과 같은 검증 규칙). 단, 이미 지난 기존 마감 시각을 **그대로 두는 것**은 허용한다(마감된 투표의 오타만 고칠 수 있도록, /code-review 후 결정)
- 로그인 후 원래 보던 관리 화면으로 돌아간다(`?next=`, 앱 내부 경로만 허용)
- 페이지: `/admin/login`, `/new`(관리자), `/polls/[id]/edit`(관리자). 투표 화면에 관리자에게만 수정/삭제 버튼

## Testing Decisions

- Seam 1: 세션 모듈(발급→검증 성공, 변조·만료·다른 비밀키 거부, 비밀번호 비교)
- Seam 2: polls 모듈(수정 후 조회에 반영, 다른 투표의 선택지 ID로 수정 거부, 득표 보존, 삭제 후 없음)
- API 권한(401)은 dev 서버에 대한 수동 확인

## Out of Scope

- 관리자 개별 계정, 비밀번호 변경 화면, 로그인 시도 제한, 수정 이력, 선택지 추가/삭제
