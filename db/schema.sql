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
