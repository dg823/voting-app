import { afterAll, describe, expect, test } from "vitest";
import { castVote, createPoll, deletePoll, getPoll, listPolls } from "./polls";

const created: string[] = [];
async function make(question: string, options: string[]) {
  const id = await createPoll({ question, options });
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
