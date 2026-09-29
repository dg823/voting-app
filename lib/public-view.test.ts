import { describe, expect, test } from "vitest";
import type { Poll } from "./polls";
import { publicPoll, publicSummary } from "./public-view";

const poll = (resultsAfterClose: boolean, status: Poll["status"]): Poll => ({
  id: "p",
  question: "q",
  createdAt: new Date("2026-09-29T00:00:00Z"),
  status,
  ballotCount: 3,
  opensAt: null,
  closesAt: new Date("2026-09-30T00:00:00Z"),
  choiceMode: "single",
  isAnonymous: true,
  resultsAfterClose,
  options: [
    { id: "a", label: "A", votes: 2 },
    { id: "b", label: "B", votes: 1 },
  ],
});

describe("API로 내보내는 투표", () => {
  test("결과가 숨겨진 동안에는 득표수와 투표자 수를 빼고 선택지 이름만 준다", () => {
    const view = publicPoll(poll(true, "open"), false);
    expect(view.options).toEqual([
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ]);
    expect(view).not.toHaveProperty("ballotCount");
    expect(view.resultsHidden).toBe(true);
  });

  test("마감 후에는 득표수를 준다", () => {
    const view = publicPoll(poll(true, "closed"), false);
    expect(view.options.map((o) => ("votes" in o ? o.votes : null))).toEqual([2, 1]);
    expect(view.resultsHidden).toBe(false);
  });

  test("관리자에게는 마감 전에도 득표수를 준다", () => {
    expect(publicPoll(poll(true, "open"), true).resultsHidden).toBe(false);
  });

  test("목록 요약도 결과가 숨겨진 동안에는 투표자 수를 뺀다", () => {
    expect(publicSummary(poll(true, "open"), false)).not.toHaveProperty("ballotCount");
    expect(publicSummary(poll(false, "open"), false)).toHaveProperty("ballotCount", 3);
  });
});
