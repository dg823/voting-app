import { describe, expect, test } from "vitest";
import { validatePollInput } from "./validation";

describe("validatePollInput", () => {
  test("질문과 선택지 2개인 투표는 통과하고 공백이 정리된다", () => {
    expect(validatePollInput({ question: "  점심 메뉴? ", options: [" 치킨 ", "피자"] })).toEqual({
      ok: true,
      value: { question: "점심 메뉴?", options: ["치킨", "피자"], closesAt: null },
    });
  });

  test("빈 질문은 거부된다", () => {
    expect(validatePollInput({ question: "   ", options: ["a", "b"] }).ok).toBe(false);
  });

  test("선택지가 1개면 거부된다", () => {
    expect(validatePollInput({ question: "q", options: ["a"] }).ok).toBe(false);
  });

  test("선택지가 6개면 거부된다", () => {
    expect(validatePollInput({ question: "q", options: ["a", "b", "c", "d", "e", "f"] }).ok).toBe(false);
  });

  test("빈 선택지가 섞여 있으면 거부된다", () => {
    expect(validatePollInput({ question: "q", options: ["a", " "] }).ok).toBe(false);
  });

  test("형식이 잘못된 입력은 거부된다", () => {
    expect(validatePollInput(null).ok).toBe(false);
    expect(validatePollInput({ question: "q", options: "a,b" }).ok).toBe(false);
  });
});

describe("마감 시각 검증", () => {
  const now = new Date("2026-09-29T09:00:00Z");
  const base = { question: "q", options: ["a", "b"] };

  test("마감 시각을 비워두면 무기한(null)이다", () => {
    expect(validatePollInput(base, now)).toMatchObject({ ok: true, value: { closesAt: null } });
    expect(validatePollInput({ ...base, closesAt: "" }, now)).toMatchObject({ ok: true, value: { closesAt: null } });
  });

  test("미래 마감 시각은 Date로 통과한다", () => {
    const result = validatePollInput({ ...base, closesAt: "2026-09-29T10:00:00.000Z" }, now);
    expect(result.ok && result.value.closesAt?.toISOString()).toBe("2026-09-29T10:00:00.000Z");
  });

  test("지난 마감 시각은 거부된다", () => {
    expect(validatePollInput({ ...base, closesAt: "2026-09-29T08:59:00.000Z" }, now).ok).toBe(false);
  });

  test("날짜가 아닌 값은 거부된다", () => {
    expect(validatePollInput({ ...base, closesAt: "내일" }, now).ok).toBe(false);
    expect(validatePollInput({ ...base, closesAt: 123 }, now).ok).toBe(false);
  });
});

describe("수정 시 마감 시각 검증", () => {
  const now = new Date("2026-09-29T09:00:00Z");
  const base = { question: "q", options: ["a", "b"] };
  const pastIso = "2026-09-28T09:00:00.000Z";

  test("이미 지난 기존 마감 시각을 그대로 두는 것은 허용된다", () => {
    const result = validatePollInput({ ...base, closesAt: pastIso }, now, { currentClosesAt: new Date(pastIso) });
    expect(result.ok && result.value.closesAt?.toISOString()).toBe(pastIso);
  });

  test("다른 과거 시각으로 바꾸는 것은 거부된다", () => {
    const result = validatePollInput({ ...base, closesAt: "2026-09-27T09:00:00.000Z" }, now, {
      currentClosesAt: new Date(pastIso),
    });
    expect(result.ok).toBe(false);
  });
});
