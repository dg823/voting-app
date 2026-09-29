import { describe, expect, test } from "vitest";
import { canSeeResults, computeResults } from "./results";

const opt = (id: string, votes: number) => ({ id, label: id, votes });

describe("computeResults", () => {
  test("투표 0건이면 총 0표, 모든 득표율 0%, 선두 없음", () => {
    const r = computeResults([opt("a", 0), opt("b", 0)]);
    expect(r.total).toBe(0);
    expect(r.rows.map((x) => [x.share, x.isLeader])).toEqual([
      [0, false],
      [0, false],
    ]);
  });

  test("1건이면 그 선택지가 100%이고 선두다", () => {
    const r = computeResults([opt("a", 0), opt("b", 1)]);
    expect(r.total).toBe(1);
    expect(r.rows.map((x) => [x.share, x.isLeader])).toEqual([
      [0, false],
      [100, true],
    ]);
  });

  test("득표율은 정수로 반올림한다 (1/3 → 33%, 2/3 → 67%)", () => {
    const r = computeResults([opt("a", 1), opt("b", 2)]);
    expect(r.rows.map((x) => x.share)).toEqual([33, 67]);
  });

  test("동률 최다 득표는 모두 선두다", () => {
    const r = computeResults([opt("a", 2), opt("b", 2), opt("c", 1)]);
    expect(r.rows.map((x) => x.isLeader)).toEqual([true, true, false]);
    expect(r.rows.map((x) => x.share)).toEqual([40, 40, 20]);
  });

  test("선택지 순서와 득표수는 그대로 유지된다", () => {
    const r = computeResults([opt("x", 3), opt("y", 7)]);
    expect(r.rows.map((x) => [x.label, x.votes])).toEqual([
      ["x", 3],
      ["y", 7],
    ]);
  });
});

describe("복수 선택 득표율", () => {
  test("득표율은 투표자 수 기준이라 합이 100%를 넘을 수 있다", () => {
    // 투표자 4명: a를 3명, b를 2명, c를 1명이 골랐다.
    const r = computeResults([opt("a", 3), opt("b", 2), opt("c", 1)], 4);
    expect(r.total).toBe(4);
    expect(r.rows.map((x) => x.share)).toEqual([75, 50, 25]);
    expect(r.rows.map((x) => x.isLeader)).toEqual([true, false, false]);
  });
});

describe("결과를 보여줄 수 있는지", () => {
  const poll = (resultsAfterClose: boolean, status: "scheduled" | "open" | "closed") => ({ resultsAfterClose, status });

  test("항상 공개 투표는 누구나 언제든 본다", () => {
    expect(canSeeResults(poll(false, "open"), false)).toBe(true);
  });

  test("마감 후 공개 투표는 마감 전에는 숨겨지고 마감되면 보인다", () => {
    expect(canSeeResults(poll(true, "scheduled"), false)).toBe(false);
    expect(canSeeResults(poll(true, "open"), false)).toBe(false);
    expect(canSeeResults(poll(true, "closed"), false)).toBe(true);
  });

  test("관리자는 마감 전에도 본다", () => {
    expect(canSeeResults(poll(true, "open"), true)).toBe(true);
  });
});
