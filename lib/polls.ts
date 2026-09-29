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

// ADR-0002: 마감 여부는 앱 서버 시계가 아니라 DB 시각(now())으로 판정한다.
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

export async function getPoll(id: string): Promise<Poll | null> {
  if (!UUID.test(id)) return null;
  const polls = await sql`
    select id, question, created_at, closes_at, coalesce(closes_at <= now(), false) as is_closed
    from polls where id = ${id}`;
  if (polls.length === 0) return null;
  const options = await sql`
    select id, label, vote_count from options where poll_id = ${id} order by position, id`;
  return {
    ...toSummary(polls[0]),
    options: options.map((o) => ({ id: o.id, label: o.label, votes: o.vote_count })),
  };
}

export async function listPolls(): Promise<PollSummary[]> {
  const rows = await sql`
    select id, question, created_at, closes_at, coalesce(closes_at <= now(), false) as is_closed
    from polls order by created_at desc`;
  return rows.map(toSummary);
}

export async function deletePoll(id: string): Promise<void> {
  await sql`delete from polls where id = ${id}`;
}

export type VoteResult = "ok" | "not_found" | "invalid_option" | "closed";

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
