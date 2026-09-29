# Spec: 투표 마감 시각 + 결과 그래프 + 제작자 이름 표시

**Status:** ready-for-agent

## Problem Statement

동아리 회장: "투표를 계속 열어두니까 사람들이 마감 없이 늘어져서 참여를 안 해요. 결과도 숫자 말고 그래프로 보고 싶어요." 또 과제 제출용으로 앱 화면에 제작자(이동건)가 드러나야 한다.

## Solution

1. 투표 생성자가 투표를 만들 때 **마감 시각**을 선택적으로 정한다. 마감 시각이 지나면 투표는 **마감됨** 상태가 되어 투표 행위를 받지 않는다(화면·서버 모두).
2. 결과 화면은 숫자 리스트 대신 선택지별 **가로 막대그래프**(득표율 %, 득표수)와 총 투표수를 보여준다.
3. 모든 화면 상단 헤더와 하단에 제작자 이름 "이동건"이 표시된다.

## User Stories

1. As a 투표 생성자, I want to 투표를 만들 때 마감 시각을 선택적으로 입력하고, so that 참여를 재촉할 수 있다
2. As a 투표 생성자, I want to 마감 시각을 비워두면 무기한 진행되고, so that 기존처럼 쓸 수도 있다
3. As a 투표 생성자, I want to 이미 지난 시각을 마감 시각으로 넣으면 거부되고, so that 만들자마자 닫힌 투표가 생기지 않는다
4. As a 투표자, I want to 목록에서 각 투표가 진행 중인지 마감됐는지 보고, so that 참여 가능한 투표를 고른다
5. As a 투표자, I want to 투표 화면에서 마감 시각과 남은 시간을 보고, so that 언제까지 참여해야 하는지 안다
6. As a 투표자, I want to 마감된 투표에서는 투표 버튼이 비활성화되고 "마감된 투표입니다" 안내를 보고, so that 헷갈리지 않는다
7. As a 투표자, I want to 마감된 투표라도 결과는 볼 수 있고, so that 최종 결과를 확인한다
8. As a 투표자, I want to 화면을 열어둔 채 마감 시각이 지나면 제출 시 서버가 거부하고 안내받고, so that 마감 후 표가 섞이지 않는다
9. As a 투표자, I want to 결과를 선택지별 가로 막대그래프로 보고, so that 한눈에 비교한다
10. As a 투표자, I want to 각 막대에 득표율(%)과 득표수를 함께 보고, so that 정확한 수치도 안다
11. As a 투표자, I want to 가장 많이 득표한 선택지가 강조되고, so that 선두를 바로 안다
12. As a 투표자, I want to 투표가 0건일 때 "아직 투표가 없습니다"를 보고 그래프가 깨지지 않고, so that 오류로 오해하지 않는다
13. As a 과제 평가자, I want to 모든 화면에서 제작자 이름 "이동건"을 보고, so that 누구의 결과물인지 안다

## Implementation Decisions

- Schema: `polls.closes_at timestamptz null` 추가(`add column if not exists`). 없으면 무기한
- 마감 판정은 DB 시각 기준, 투표 행위 기록 SQL 안에서 원자적으로 한다(ADR-0002). polls 모듈의 투표 행위 결과는 `ok | not_found | invalid_option | closed` 중 하나
- `POST /api/polls/[id]/vote`는 `closed`일 때 409 + "마감된 투표입니다"
- `POST /api/polls`는 `closesAt`(ISO 문자열, 선택)을 받고, 과거 시각이면 400
- 입력 폼은 `datetime-local`. 브라우저가 로컬 시각을 ISO(UTC)로 바꿔 전송하고, 화면 표시는 `Asia/Seoul` 기준
- 득표율 계산은 순수 함수: 정수 % 반올림, 총 0건이면 전부 0, 최다 득표(동률 포함) 표시
- 그래프: 라이브러리 없이 CSS 가로 막대(ADR-0003), 접근성을 위해 `role="img"` + `aria-label`에 수치 포함
- 제작자 이름은 공통 레이아웃(헤더/푸터) 한 곳에서 상수로 렌더링

## Testing Decisions

- **Seam 1:** polls 모듈 통합 테스트(실제 DB): 마감 시각 저장/조회, 마감된 투표에 투표 행위 시 `closed`, 마감 시각 없는 투표는 정상
- **Seam 2:** 결과 계산 순수 함수: 0건 / 1건 / 동률 / 반올림
- **Seam 3:** 입력 검증 순수 함수: 과거 마감 시각 거부, 비워두기 허용
- 좋은 테스트 = 공개 인터페이스 동작만 확인, 기대값은 손으로 계산한 리터럴

## Out of Scope

- 마감 시각 수정/연장, 마감 알림, 실시간 갱신, 원형/시계열 차트

## Further Notes

- 기존 MVP 투표(마감 시각 없음)는 그대로 동작해야 한다
