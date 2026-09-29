import { afterAll, describe, expect, test } from "vitest";
import { castVote, createPoll, deletePoll, getPoll, listPolls, updatePoll } from "./polls";

const created: string[] = [];
async function make(question: string, options: string[], closesAt: Date | null = null) {
  const id = await createPoll({ question, options, closesAt });
  created.push(id);
  return id;
}

afterAll(async () => {
  await Promise.all(created.map(deletePoll));
});

describe("투표 만들기", () => {
  test("만든 투표는 입력한 선택지 순서대로 조회되고 득표는 0이다", async () => {
    const id = await make("[test] 점심 메뉴?", ["치킨", "피자", "국밥"]);
    const poll = await getPoll(id);
    expect(poll?.question).toBe("[test] 점심 메뉴?");
    expect(poll?.options.map((o) => [o.label, o.votes])).toEqual([
      ["치킨", 0],
      ["피자", 0],
      ["국밥", 0],
    ]);
  });

  test("목록에는 최신 투표가 맨 앞에 온다", async () => {
    const first = await make("[test] 먼저", ["a", "b"]);
    const second = await make("[test] 나중", ["a", "b"]);
    const ids = (await listPolls()).map((p) => p.id);
    expect(ids.indexOf(second)).toBeLessThan(ids.indexOf(first));
  });

  test("없는 투표는 null이다", async () => {
    expect(await getPoll("00000000-0000-0000-0000-000000000000")).toBeNull();
    expect(await getPoll("not-a-uuid")).toBeNull();
  });
});

describe("투표 행위", () => {
  test("선택한 선택지의 득표만 1 오른다", async () => {
    const id = await make("[test] 투표", ["a", "b"]);
    const [a, b] = (await getPoll(id))!.options;
    expect(await castVote(id, b.id)).toBe("ok");
    expect(await castVote(id, b.id)).toBe("ok");
    const after = (await getPoll(id))!.options;
    expect(after.map((o) => o.votes)).toEqual([0, 2]);
    expect(after[0].id).toBe(a.id);
  });

  test("다른 투표의 선택지로는 투표할 수 없다", async () => {
    const one = await make("[test] 하나", ["a", "b"]);
    const two = await make("[test] 둘", ["c", "d"]);
    const otherOption = (await getPoll(two))!.options[0];
    expect(await castVote(one, otherOption.id)).toBe("invalid_option");
    expect((await getPoll(two))!.options[0].votes).toBe(0);
  });

  test("없는 투표에는 not_found", async () => {
    expect(await castVote("00000000-0000-0000-0000-000000000000", "00000000-0000-0000-0000-000000000000")).toBe(
      "not_found",
    );
    expect(await castVote("bad", "bad")).toBe("not_found");
  });
});

describe("마감 시각", () => {
  const future = () => new Date(Date.now() + 60 * 60 * 1000);
  const past = () => new Date(Date.now() - 60 * 1000);

  test("마감 시각 없이 만든 투표는 진행 중이고 투표할 수 있다", async () => {
    const id = await make("[test] 무기한", ["a", "b"]);
    const poll = (await getPoll(id))!;
    expect(poll.closesAt).toBeNull();
    expect(poll.isClosed).toBe(false);
    expect(await castVote(id, poll.options[0].id)).toBe("ok");
  });

  test("미래 마감 시각은 저장되고 그 전까지는 투표할 수 있다", async () => {
    const closesAt = future();
    const id = await make("[test] 한 시간 뒤 마감", ["a", "b"], closesAt);
    const poll = (await getPoll(id))!;
    expect(poll.closesAt?.getTime()).toBe(closesAt.getTime());
    expect(poll.isClosed).toBe(false);
    expect(await castVote(id, poll.options[0].id)).toBe("ok");
  });

  test("마감 시각이 지난 투표는 마감됨이고 투표 행위를 거부하며 득표가 바뀌지 않는다", async () => {
    const id = await make("[test] 이미 마감", ["a", "b"], past());
    const poll = (await getPoll(id))!;
    expect(poll.isClosed).toBe(true);
    expect(await castVote(id, poll.options[0].id)).toBe("closed");
    expect((await getPoll(id))!.options[0].votes).toBe(0);
  });

  test("목록에서도 마감 여부를 알 수 있다", async () => {
    const id = await make("[test] 목록 마감", ["a", "b"], past());
    const summary = (await listPolls()).find((p) => p.id === id);
    expect(summary?.isClosed).toBe(true);
  });
});

describe("관리자의 투표 수정", () => {
  test("질문·선택지 이름·마감 시각을 바꾸면 조회에 반영되고 득표는 유지된다", async () => {
    const id = await make("[test] 오타 있는 질문", ["치킨", "피잔"]);
    const [a, b] = (await getPoll(id))!.options;
    await castVote(id, b.id);
    const closesAt = new Date(Date.now() + 60 * 60 * 1000);

    expect(
      await updatePoll(id, {
        question: "[test] 고친 질문",
        options: [
          { id: a.id, label: "치킨" },
          { id: b.id, label: "피자" },
        ],
        closesAt,
      }),
    ).toBe("ok");

    const poll = (await getPoll(id))!;
    expect(poll.question).toBe("[test] 고친 질문");
    expect(poll.options.map((o) => [o.label, o.votes])).toEqual([
      ["치킨", 0],
      ["피자", 1],
    ]);
    expect(poll.closesAt?.getTime()).toBe(closesAt.getTime());
  });

  test("마감 시각을 지우면 마감된 투표가 다시 진행 중이 된다", async () => {
    const id = await make("[test] 다시 열기", ["a", "b"], new Date(Date.now() - 60 * 1000));
    const poll = (await getPoll(id))!;
    expect(poll.isClosed).toBe(true);
    const options = poll.options.map(({ id, label }) => ({ id, label }));
    expect(await updatePoll(id, { question: poll.question, options, closesAt: null })).toBe("ok");
    expect((await getPoll(id))!.isClosed).toBe(false);
  });

  test("다른 투표의 선택지 ID가 섞이면 아무것도 바뀌지 않는다", async () => {
    const one = await make("[test] 원래 질문", ["a", "b"]);
    const two = await make("[test] 남의 투표", ["c", "d"]);
    const [a] = (await getPoll(one))!.options;
    const [c] = (await getPoll(two))!.options;

    const result = await updatePoll(one, {
      question: "[test] 바뀌면 안 됨",
      options: [
        { id: a.id, label: "a2" },
        { id: c.id, label: "c2" },
      ],
      closesAt: null,
    });
    expect(result).toBe("invalid_option");
    expect((await getPoll(one))!.question).toBe("[test] 원래 질문");
    expect((await getPoll(two))!.options[0].label).toBe("c");
  });

  test("선택지 개수가 기존과 다르면 거부된다", async () => {
    const id = await make("[test] 개수", ["a", "b", "c"]);
    const [a, b] = (await getPoll(id))!.options;
    const result = await updatePoll(id, {
      question: "q",
      options: [
        { id: a.id, label: "a" },
        { id: b.id, label: "b" },
      ],
      closesAt: null,
    });
    expect(result).toBe("invalid_option");
  });

  test("없는 투표는 not_found", async () => {
    expect(await updatePoll("00000000-0000-0000-0000-000000000000", { question: "q", options: [], closesAt: null })).toBe(
      "not_found",
    );
  });
});

describe("관리자의 투표 삭제", () => {
  test("삭제한 투표는 조회되지 않고 목록에서도 사라진다", async () => {
    const id = await createPoll({ question: "[test] 지울 투표", options: ["a", "b"], closesAt: null });
    expect(await deletePoll(id)).toBe(true);
    expect(await getPoll(id)).toBeNull();
    expect((await listPolls()).some((p) => p.id === id)).toBe(false);
  });

  test("없는 투표 삭제는 false", async () => {
    expect(await deletePoll("00000000-0000-0000-0000-000000000000")).toBe(false);
    expect(await deletePoll("bad")).toBe(false);
  });
});
