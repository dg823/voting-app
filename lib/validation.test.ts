import { describe, expect, test } from "vitest";
import { validatePollInput } from "./validation";

describe("validatePollInput", () => {
  test("질문과 선택지 2개인 투표는 통과하고 공백이 정리된다", () => {
    expect(validatePollInput({ question: "  점심 메뉴? ", options: [" 치킨 ", "피자"] })).toEqual({
      ok: true,
      value: { question: "점심 메뉴?", options: ["치킨", "피자"] },
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
