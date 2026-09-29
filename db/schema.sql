-- 여러 번 실행해도 안전합니다. Neon SQL Editor에서 실행하세요.
create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  created_at timestamptz not null default now()
);

create table if not exists options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  label text not null,
  vote_count integer not null default 0,
  position integer not null default 0
);

create index if not exists options_poll_id_idx on options(poll_id);

-- [기능 추가] 투표 마감 시각 (선택 입력, null이면 무기한)
alter table polls add column if not exists closes_at timestamptz;

-- [투표 설정 확장] ADR-0005 — 기존 투표는 익명·단일 선택·항상 공개·즉시 시작으로 동작
alter table polls add column if not exists opens_at timestamptz;
alter table polls add column if not exists choice_mode text not null default 'single';
alter table polls add column if not exists is_anonymous boolean not null default true;
alter table polls add column if not exists results_after_close boolean not null default false;
alter table polls add column if not exists ballot_count integer not null default 0;

do $$ begin
  alter table polls add constraint polls_choice_mode_check check (choice_mode in ('single', 'multiple'));
exception when duplicate_object then null; end $$;

create table if not exists ballots (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  voter_name text,
  created_at timestamptz not null default now()
);

-- 실명 투표의 1인 1표: 같은 투표에서 같은 이름(대소문자 무시)은 한 번만
create unique index if not exists ballots_poll_voter_name_uniq
  on ballots (poll_id, lower(voter_name)) where voter_name is not null;

create table if not exists ballot_choices (
  ballot_id uuid not null references ballots(id) on delete cascade,
  option_id uuid not null references options(id) on delete cascade,
  primary key (ballot_id, option_id)
);

-- 기존 투표(단일 선택)의 투표자 수 = 득표 합. 투표지 기록이 없는 투표에만 채운다.
update polls p set ballot_count = s.total
from (select poll_id, sum(vote_count)::int as total from options group by poll_id) s
where s.poll_id = p.id and p.ballot_count = 0
  and not exists (select 1 from ballots b where b.poll_id = p.id);
