import { sql } from "./db";
import type { PollInput } from "./validation";

export type Option = { id: string; label: string; votes: number };
export type Poll = {
  id: string;
  question: string;
  createdAt: Date;
  closesAt: Date | null;
  isClosed: boolean;
  options: Option[];
};
export type PollSummary = Omit<Poll, "options">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PollRow = Record<string, unknown>;
const toSummary = (r: PollRow): PollSummary => ({
  id: r.id as string,
  question: r.question as string,
  createdAt: new Date(r.created_at as string),
  closesAt: r.closes_at ? new Date(r.closes_at as string) : null,
  isClosed: r.is_closed as boolean,
});

export async function createPoll(input: PollInput): Promise<string> {
  // 투표와 선택지를 한 문장으로 넣어 중간에 실패해도 반쪽짜리 투표가 남지 않게 한다.
  const rows = await sql`
    with p as (
      insert into polls (question, closes_at) values (${input.question}, ${input.closesAt}) returning id
    )
    insert into options (poll_id, label, position)
    select p.id, o.label, o.ord - 1
    from p, unnest(${input.options}::text[]) with ordinality as o(label, ord)
    returning poll_id`;
  return rows[0].poll_id;
}

// 목록·상세가 공유하는 유일한 투표 조회. id가 null이면 전체를 최신순으로.
// ADR-0002: is_closed는 앱 서버 시계가 아니라 DB 시각(now())으로 계산한다.
async function selectPolls(id: string | null): Promise<PollSummary[]> {
  const rows = await sql`
    select id, question, created_at, closes_at, coalesce(closes_at <= now(), false) as is_closed
    from polls
    where ${id}::uuid is null or id = ${id}::uuid
    order by created_at desc`;
  return rows.map(toSummary);
}

export async function getPoll(id: string): Promise<Poll | null> {
  if (!UUID.test(id)) return null;
  const [summary] = await selectPolls(id);
  if (!summary) return null;
  const options = await sql`
    select id, label, vote_count from options where poll_id = ${id} order by position, id`;
  return {
    ...summary,
    options: options.map((o) => ({ id: o.id, label: o.label, votes: o.vote_count })),
  };
}

export function listPolls(): Promise<PollSummary[]> {
  return selectPolls(null);
}

export type PollUpdate = {
  question: string;
  options: { id: string; label: string }[];
  closesAt: Date | null;
};
export type UpdateResult = "ok" | "not_found" | "invalid_option";

// 선택지 개수는 바꾸지 않는다(득표 보존). 선택지 ID가 이 투표의 선택지와 정확히 일치할 때만,
// 검사와 수정을 한 문장에서 처리해 일부만 바뀌는 일이 없게 한다.
export async function updatePoll(id: string, update: PollUpdate): Promise<UpdateResult> {
  if (!UUID.test(id)) return "not_found";
  if (!update.options.every((o) => UUID.test(o.id))) return "invalid_option";

  const ids = update.options.map((o) => o.id);
  const labels = update.options.map((o) => o.label);
  const [row] = await sql`
    with input as (
      select * from unnest(${ids}::uuid[], ${labels}::text[]) as i(id, label)
    ),
    valid as (
      select
        (select count(distinct id) from input) = ${ids.length}
        and (select count(*) from options where poll_id = ${id}) = ${ids.length}
        and (select count(*) from options o join input i on o.id = i.id where o.poll_id = ${id}) = ${ids.length}
        as ok
    ),
    updated_poll as (
      update polls set question = ${update.question}, closes_at = ${update.closesAt}
      where id = ${id} and (select ok from valid)
      returning id
    ),
    updated_options as (
      update options o set label = i.label
      from input i
      where o.id = i.id and o.poll_id = ${id} and (select ok from valid)
    )
    select
      exists(select 1 from polls where id = ${id}) as found,
      (select count(*) from updated_poll) as poll_updated`;

  if (!row.found) return "not_found";
  return Number(row.poll_updated) === 1 ? "ok" : "invalid_option";
}

/** 선택지와 득표는 on delete cascade로 함께 지워진다. */
export async function deletePoll(id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const rows = await sql`delete from polls where id = ${id} returning id`;
  return rows.length > 0;
}

export type VoteResult = "ok" | "not_found" | "invalid_option" | "closed";

/** 409 응답의 reason: 이미 투표함(쿠키) 또는 마감됨. */
export type VoteRejectionReason = "already_voted" | "closed";

export async function castVote(pollId: string, optionId: string): Promise<VoteResult> {
  if (!UUID.test(pollId)) return "not_found";
  if (!UUID.test(optionId)) return "invalid_option";

  // 마감 검사와 득표 증가를 한 문장에서 처리해 조회-기록 사이의 경쟁 상황을 없앤다.
  const updated = await sql`
    update options o set vote_count = o.vote_count + 1
    from polls p
    where o.id = ${optionId} and o.poll_id = ${pollId} and p.id = o.poll_id
      and (p.closes_at is null or p.closes_at > now())
    returning o.id`;
  if (updated.length > 0) return "ok";

  const poll = await getPoll(pollId);
  if (!poll) return "not_found";
  if (poll.isClosed) return "closed";
  return "invalid_option";
}
