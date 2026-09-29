import { describe, expect, test } from "vitest";
import { validatePollInput } from "./validation";

const now = new Date("2026-09-29T09:00:00Z");
const base = { question: "q", options: ["a", "b"] };
const at = (iso: string) => `2026-09-${iso}:00.000Z`;

describe("투표 설정 기본값", () => {
  test("설정을 보내지 않으면 익명·단일 선택·항상 공개·즉시 시작이다", () => {
    expect(validatePollInput(base, now)).toMatchObject({
      ok: true,
      value: { choiceMode: "single", isAnonymous: true, resultsAfterClose: false, opensAt: null },
    });
  });

  test("실명·복수 선택·마감 후 공개를 고를 수 있다", () => {
    const result = validatePollInput(
      { ...base, choiceMode: "multiple", isAnonymous: false, resultsAfterClose: true, closesAt: at("30T09:00") },
      now,
    );
    expect(result).toMatchObject({
      ok: true,
      value: { choiceMode: "multiple", isAnonymous: false, resultsAfterClose: true },
    });
  });

  test("알 수 없는 선택 방식은 거부된다", () => {
    expect(validatePollInput({ ...base, choiceMode: "ranked" }, now).ok).toBe(false);
  });
});

describe("예약 시작 시각", () => {
  test("시작 시각과 마감 시각을 함께 정할 수 있다", () => {
    const result = validatePollInput({ ...base, opensAt: at("29T12:00"), closesAt: at("29T18:00") }, now);
    expect(result.ok && result.value.opensAt?.toISOString()).toBe(at("29T12:00"));
  });

  test("시작 시각이 마감 시각과 같거나 늦으면 거부된다", () => {
    expect(validatePollInput({ ...base, opensAt: at("29T18:00"), closesAt: at("29T18:00") }, now).ok).toBe(false);
    expect(validatePollInput({ ...base, opensAt: at("29T19:00"), closesAt: at("29T18:00") }, now).ok).toBe(false);
  });

  test("지난 시작 시각은 즉시 시작과 같으므로 허용된다", () => {
    expect(validatePollInput({ ...base, opensAt: at("29T08:00") }, now).ok).toBe(true);
  });

  test("날짜가 아닌 시작 시각은 거부된다", () => {
    expect(validatePollInput({ ...base, opensAt: "곧" }, now).ok).toBe(false);
  });
});

describe("마감 후 결과 공개", () => {
  test("마감 시각 없이 마감 후 공개를 고르면 거부된다", () => {
    expect(validatePollInput({ ...base, resultsAfterClose: true }, now).ok).toBe(false);
  });
});
