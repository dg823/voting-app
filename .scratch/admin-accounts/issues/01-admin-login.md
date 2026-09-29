# 01: 관리자 로그인/로그아웃 + 투표 만들기를 관리자 전용으로

**What to build:** 관리자가 `/admin/login`에서 비밀번호로 로그인하면 1일 세션이 생기고 헤더에 "새 투표 만들기"와 "로그아웃"이 보인다. `/new`와 `POST /api/polls`는 관리자만 쓸 수 있다.

**Blocked by:** code-cleanup 01

**Status:** ready-for-agent

- [ ] 틀린 비밀번호는 401 + 안내
- [ ] 변조·만료된 세션 쿠키는 관리자로 인정되지 않는다
- [ ] 비로그인 `/new` 접근 → `/admin/login`으로 이동
- [ ] 비로그인 `POST /api/polls` → 401
