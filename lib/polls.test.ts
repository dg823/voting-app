import { afterAll, describe, expect, test } from "vitest";
import { createPoll, deletePoll, getPoll, listPolls } from "./polls";

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
