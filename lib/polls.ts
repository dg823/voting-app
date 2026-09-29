import { sql } from "./db";
import type { PollInput } from "./validation";

export type Option = { id: string; label: string; votes: number };
export type Poll = { id: string; question: string; createdAt: Date; options: Option[] };
export type PollSummary = { id: string; question: string; createdAt: Date };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createPoll(input: PollInput): Promise<string> {
  // 투표와 선택지를 한 문장으로 넣어 중간에 실패해도 반쪽짜리 투표가 남지 않게 한다.
  const rows = await sql`
    with p as (
      insert into polls (question) values (${input.question}) returning id
    )
    insert into options (poll_id, label, position)
    select p.id, o.label, o.ord - 1
    from p, unnest(${input.options}::text[]) with ordinality as o(label, ord)
    returning poll_id`;
  return rows[0].poll_id;
}

export async function getPoll(id: string): Promise<Poll | null> {
  if (!UUID.test(id)) return null;
  const polls = await sql`select id, question, created_at from polls where id = ${id}`;
  if (polls.length === 0) return null;
  const options = await sql`
    select id, label, vote_count from options where poll_id = ${id} order by position, id`;
  return {
    id: polls[0].id,
    question: polls[0].question,
    createdAt: new Date(polls[0].created_at),
    options: options.map((o) => ({ id: o.id, label: o.label, votes: o.vote_count })),
  };
}

export async function listPolls(): Promise<PollSummary[]> {
  const rows = await sql`select id, question, created_at from polls order by created_at desc`;
  return rows.map((r) => ({ id: r.id, question: r.question, createdAt: new Date(r.created_at) }));
}

export async function deletePoll(id: string): Promise<void> {
  await sql`delete from polls where id = ${id}`;
}
