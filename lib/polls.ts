import { sql } from "./db";
import type { ChoiceMode, PollInput, PollSettings } from "./validation";
import { MAX_VOTER_NAME_LENGTH } from "./voter-name";

export type PollStatus = "scheduled" | "open" | "closed";
export type Option = { id: string; label: string; votes: number };
export type PollSummary = {
  id: string;
  question: string;
  createdAt: Date;
  status: PollStatus;
  ballotCount: number;
} & PollSettings;
export type Poll = PollSummary & { options: Option[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PollRow = Record<string, unknown>;
const toDate = (v: unknown) => (v ? new Date(v as string) : null);
const toSummary = (r: PollRow): PollSummary => ({
  id: r.id as string,
  question: r.question as string,
  createdAt: new Date(r.created_at as string),
  opensAt: toDate(r.opens_at),
  closesAt: toDate(r.closes_at),
  status: r.status as PollStatus,
  choiceMode: r.choice_mode as ChoiceMode,
  isAnonymous: r.is_anonymous as boolean,
  resultsAfterClose: r.results_after_close as boolean,
  ballotCount: r.ballot_count as number,
});

export async function createPoll(input: PollInput): Promise<string> {
  // 투표와 선택지를 한 문장으로 넣어 중간에 실패해도 반쪽짜리 투표가 남지 않게 한다.
  const rows = await sql`
    with p as (
      insert into polls (question, opens_at, closes_at, choice_mode, is_anonymous, results_after_close)
      values (${input.question}, ${input.opensAt}, ${input.closesAt}, ${input.choiceMode},
              ${input.isAnonymous}, ${input.resultsAfterClose})
      returning id
    )
    insert into options (poll_id, label, position)
    select p.id, o.label, o.ord - 1
    from p, unnest(${input.options}::text[]) with ordinality as o(label, ord)
    returning poll_id`;
  return rows[0].poll_id;
}

// 목록·상세가 공유하는 유일한 투표 조회. id가 null이면 전체를 최신순으로.
// ADR-0002/0005: 예정·진행 중·마감됨은 앱 서버 시계가 아니라 DB 시각(now())으로 계산한다.
async function selectPolls(id: string | null): Promise<PollSummary[]> {
  const rows = await sql`
    select id, question, created_at, opens_at, closes_at, choice_mode, is_anonymous,
           results_after_close, ballot_count,
           case
             when opens_at is not null and opens_at > now() then 'scheduled'
             when closes_at is not null and closes_at <= now() then 'closed'
             else 'open'
           end as status
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

/** 실명 투표의 선택지별 투표자 이름(투표한 순서). 익명 투표면 빈 객체. */
export async function getVoterNames(pollId: string): Promise<Record<string, string[]>> {
  if (!UUID.test(pollId)) return {};
  const rows = await sql`
    select bc.option_id, b.voter_name
    from ballots b join ballot_choices bc on bc.ballot_id = b.id
    where b.poll_id = ${pollId} and b.voter_name is not null
    order by b.created_at, b.id`;
  const names: Record<string, string[]> = {};
  for (const r of rows) (names[r.option_id] ??= []).push(r.voter_name);
  return names;
}

export type PollUpdate = { question: string; options: { id: string; label: string }[] } & PollSettings;
export type UpdateResult = "ok" | "not_found" | "invalid_option" | "settings_locked";

// 선택지 개수는 바꾸지 않는다(득표 보존). 선택지 ID가 이 투표의 선택지와 정확히 일치할 때만,
// 검사와 수정을 한 문장에서 처리해 일부만 바뀌는 일이 없게 한다.
// ADR-0005: 투표가 들어온 뒤에는 선택 방식·공개 방식을 바꿀 수 없다.
export async function updatePoll(id: string, update: PollUpdate): Promise<UpdateResult> {
  if (!UUID.test(id)) return "not_found";
  if (!update.options.every((o) => UUID.test(o.id))) return "invalid_option";

  const ids = update.options.map((o) => o.id);
  const labels = update.options.map((o) => o.label);
  const [row] = await sql`
    with input as (
      select * from unnest(${ids}::uuid[], ${labels}::text[]) as i(id, label)
    ),
    locked as (
      select ballot_count > 0 and (choice_mode <> ${update.choiceMode} or is_anonymous <> ${update.isAnonymous})
        as yes
      from polls where id = ${id}
    ),
    valid as (
      select
        (select count(distinct id) from input) = ${ids.length}
        and (select count(*) from options where poll_id = ${id}) = ${ids.length}
        and (select count(*) from options o join input i on o.id = i.id where o.poll_id = ${id}) = ${ids.length}
        and not coalesce((select yes from locked), false)
        as ok
    ),
    updated_poll as (
      update polls set
        question = ${update.question},
        opens_at = ${update.opensAt},
        closes_at = ${update.closesAt},
        choice_mode = ${update.choiceMode},
        is_anonymous = ${update.isAnonymous},
        results_after_close = ${update.resultsAfterClose}
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
      coalesce((select yes from locked), false) as locked,
      (select count(*) from updated_poll) as poll_updated`;

  if (!row.found) return "not_found";
  if (row.locked) return "settings_locked";
  return Number(row.poll_updated) === 1 ? "ok" : "invalid_option";
}

/** 선택지·투표지·득표는 on delete cascade로 함께 지워진다. */
export async function deletePoll(id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const rows = await sql`delete from polls where id = ${id} returning id`;
  return rows.length > 0;
}

export type Ballot = { optionIds: string[]; voterName?: string | null };
export type VoteResult =
  | "ok"
  | "not_found"
  | "invalid_option"
  | "not_open"
  | "closed"
  | "name_required"
  | "name_taken";

/** 409 응답의 reason: 이미 투표함(쿠키/이름), 아직 시작 전, 마감됨. */
export type VoteRejectionReason = "already_voted" | "not_open" | "closed";

const isUniqueViolation = (e: unknown) => (e as { code?: string })?.code === "23505";

export async function castVote(pollId: string, ballot: Ballot): Promise<VoteResult> {
  if (!UUID.test(pollId)) return "not_found";
  const { optionIds } = ballot;
  if (optionIds.length === 0 || !optionIds.every((id) => UUID.test(id))) return "invalid_option";
  const voterName = ballot.voterName?.trim() || null;
  if (voterName && voterName.length > MAX_VOTER_NAME_LENGTH) return "name_required";

  // ADR-0005: 일정 검사, 선택지 검사, 투표지 기록, 득표·투표자 수 증가를 한 문장에서 처리한다.
  let recorded: number;
  try {
    const [row] = await sql`
      with target as (
        select id, choice_mode, is_anonymous from polls
        where id = ${pollId}
          and (opens_at is null or opens_at <= now())
          and (closes_at is null or closes_at > now())
      ),
      picked as (
        select distinct option_id from unnest(${optionIds}::uuid[]) as p(option_id)
      ),
      valid as (
        select
          (select count(*) from picked) = ${optionIds.length}
          and (select count(*) from options o join picked p on o.id = p.option_id
               where o.poll_id = ${pollId}) = ${optionIds.length}
          and ((select choice_mode from target) = 'multiple' or ${optionIds.length} = 1)
          and ((select is_anonymous from target) or ${voterName}::text is not null)
          as ok
      ),
      ballot as (
        insert into ballots (poll_id, voter_name)
        select id, case when is_anonymous then null else ${voterName}::text end
        from target where (select ok from valid)
        returning id
      ),
      choices as (
        insert into ballot_choices (ballot_id, option_id)
        select b.id, p.option_id from ballot b, picked p
      ),
      counts as (
        update options set vote_count = vote_count + 1
        where id in (select option_id from picked) and exists (select 1 from ballot)
      ),
      total as (
        update polls set ballot_count = ballot_count + 1
        where id = ${pollId} and exists (select 1 from ballot)
      )
      select count(*)::int as recorded from ballot`;
    recorded = row.recorded;
  } catch (e) {
    if (isUniqueViolation(e)) return "name_taken";
    throw e;
  }
  if (recorded === 1) return "ok";

  const poll = await getPoll(pollId);
  if (!poll) return "not_found";
  if (poll.status === "scheduled") return "not_open";
  if (poll.status === "closed") return "closed";
  if (!poll.isAnonymous && !voterName) return "name_required";
  return "invalid_option";
}
