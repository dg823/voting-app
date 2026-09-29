import { afterAll, describe, expect, test } from "vitest";
import { castVote, createPoll, deletePoll, getPoll, getVoterNames, updatePoll } from "./polls";
import type { PollSettings } from "./validation";

const DEFAULTS: PollSettings = {
  opensAt: null,
  closesAt: null,
  choiceMode: "single",
  isAnonymous: true,
  resultsAfterClose: false,
};
const HOUR = 60 * 60 * 1000;
const inHours = (h: number) => new Date(Date.now() + h * HOUR);

const created: string[] = [];
async function make(options: string[], settings: Partial<PollSettings> = {}) {
  const id = await createPoll({ question: "[test] 설정", options, ...DEFAULTS, ...settings });
  created.push(id);
  const poll = (await getPoll(id))!;
  return { id, poll, ids: poll.options.map((o) => o.id) };
}

afterAll(async () => {
  await Promise.all(created.map(deletePoll));
});

describe("예약 시작", () => {
  test("시작 시각 전에는 예정 상태이고 투표 행위를 거부하며 득표가 바뀌지 않는다", async () => {
    const { id, poll, ids } = await make(["a", "b"], { opensAt: inHours(1), closesAt: inHours(2) });
    expect(poll.status).toBe("scheduled");
    expect(await castVote(id, { optionIds: [ids[0]] })).toBe("not_open");
    expect((await getPoll(id))!.options[0].votes).toBe(0);
  });

  test("시작 시각이 지나면 진행 중이 되어 투표할 수 있다", async () => {
    const { id, poll, ids } = await make(["a", "b"], { opensAt: new Date(Date.now() - HOUR), closesAt: inHours(1) });
    expect(poll.status).toBe("open");
    expect(await castVote(id, { optionIds: [ids[0]] })).toBe("ok");
  });

  test("마감 시각이 지나면 마감됨이다", async () => {
    const { poll } = await make(["a", "b"], { closesAt: new Date(Date.now() - 1000) });
    expect(poll.status).toBe("closed");
  });
});

describe("선택 방식", () => {
  test("단일 선택 투표에 선택지 두 개를 보내면 거부된다", async () => {
    const { id, ids } = await make(["a", "b"]);
    expect(await castVote(id, { optionIds: ids })).toBe("invalid_option");
    expect((await getPoll(id))!.ballotCount).toBe(0);
  });

  test("복수 선택 투표는 고른 선택지마다 득표가 오르고 투표자 수는 한 명씩 오른다", async () => {
    const { id, ids } = await make(["a", "b", "c"], { choiceMode: "multiple" });
    expect(await castVote(id, { optionIds: [ids[0], ids[2]] })).toBe("ok");
    expect(await castVote(id, { optionIds: [ids[0]] })).toBe("ok");
    const poll = (await getPoll(id))!;
    expect(poll.options.map((o) => o.votes)).toEqual([2, 0, 1]);
    expect(poll.ballotCount).toBe(2);
  });

  test("아무것도 고르지 않거나 같은 선택지를 두 번 보내면 거부된다", async () => {
    const { id, ids } = await make(["a", "b"], { choiceMode: "multiple" });
    expect(await castVote(id, { optionIds: [] })).toBe("invalid_option");
    expect(await castVote(id, { optionIds: [ids[0], ids[0]] })).toBe("invalid_option");
  });
});

describe("공개 방식", () => {
  test("실명 투표는 이름 없이 투표할 수 없다", async () => {
    const { id, ids } = await make(["a", "b"], { isAnonymous: false });
    expect(await castVote(id, { optionIds: [ids[0]] })).toBe("name_required");
    expect(await castVote(id, { optionIds: [ids[0]], voterName: "   " })).toBe("name_required");
  });

  test("실명 투표는 같은 이름(대소문자·공백 무시)으로 두 번 투표할 수 없고 득표도 한 번만 오른다", async () => {
    const { id, ids } = await make(["a", "b"], { isAnonymous: false });
    expect(await castVote(id, { optionIds: [ids[0]], voterName: "Kim" })).toBe("ok");
    expect(await castVote(id, { optionIds: [ids[1]], voterName: " kim " })).toBe("name_taken");
    const poll = (await getPoll(id))!;
    expect(poll.options.map((o) => o.votes)).toEqual([1, 0]);
    expect(poll.ballotCount).toBe(1);
  });

  test("실명 투표는 선택지별 투표자 이름을 돌려준다", async () => {
    const { id, ids } = await make(["a", "b", "c"], { isAnonymous: false, choiceMode: "multiple" });
    await castVote(id, { optionIds: [ids[0], ids[1]], voterName: "이동건" });
    await castVote(id, { optionIds: [ids[0]], voterName: "홍길동" });
    const names = await getVoterNames(id);
    expect([...names[ids[0]]].sort()).toEqual(["이동건", "홍길동"]);
    expect(names[ids[1]]).toEqual(["이동건"]);
    expect(names[ids[2]] ?? []).toEqual([]);
  });

  test("익명 투표는 이름을 보내도 저장하지 않는다", async () => {
    const { id, ids } = await make(["a", "b"]);
    expect(await castVote(id, { optionIds: [ids[0]], voterName: "몰래" })).toBe("ok");
    expect(await getVoterNames(id)).toEqual({});
  });
});

describe("설정 잠금", () => {
  test("투표가 들어온 뒤에는 선택 방식과 공개 방식을 바꿀 수 없지만 일정과 결과 공개 시점은 바꿀 수 있다", async () => {
    const { id, poll, ids } = await make(["a", "b"]);
    await castVote(id, { optionIds: [ids[0]] });
    const base = { question: poll.question, options: poll.options.map(({ id, label }) => ({ id, label })) };

    expect(await updatePoll(id, { ...base, ...DEFAULTS, choiceMode: "multiple" })).toBe("settings_locked");
    expect(await updatePoll(id, { ...base, ...DEFAULTS, isAnonymous: false })).toBe("settings_locked");
    expect((await getPoll(id))!.choiceMode).toBe("single");

    const closesAt = inHours(3);
    expect(await updatePoll(id, { ...base, ...DEFAULTS, closesAt, resultsAfterClose: true })).toBe("ok");
    const after = (await getPoll(id))!;
    expect(after.resultsAfterClose).toBe(true);
    expect(after.closesAt?.getTime()).toBe(closesAt.getTime());
  });

  test("투표가 없으면 선택 방식과 공개 방식을 바꿀 수 있다", async () => {
    const { id, poll } = await make(["a", "b"]);
    const base = { question: poll.question, options: poll.options.map(({ id, label }) => ({ id, label })) };
    expect(await updatePoll(id, { ...base, ...DEFAULTS, choiceMode: "multiple", isAnonymous: false })).toBe("ok");
    const after = (await getPoll(id))!;
    expect([after.choiceMode, after.isAnonymous]).toEqual(["multiple", false]);
  });
});
