import { describe, expect, test } from "vitest";
import { computeResults } from "./results";

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
