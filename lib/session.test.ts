import { describe, expect, test } from "vitest";
import { checkAdminPassword, createSessionToken, resolveSessionSecret, verifySessionToken } from "./session";

const SECRET = "test-secret-please-change";
const now = new Date("2026-09-29T09:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

describe("관리자 세션 토큰", () => {
  test("발급한 토큰은 1일 동안 유효하다", () => {
    const token = createSessionToken(SECRET, now);
    expect(verifySessionToken(token, SECRET, now)).toBe(true);
    expect(verifySessionToken(token, SECRET, new Date(now.getTime() + DAY - 1000))).toBe(true);
  });

  test("1일이 지나면 만료된다", () => {
    const token = createSessionToken(SECRET, now);
    expect(verifySessionToken(token, SECRET, new Date(now.getTime() + DAY + 1000))).toBe(false);
  });

  test("다른 비밀키로 서명된 토큰은 거부된다", () => {
    const token = createSessionToken("other-secret", now);
    expect(verifySessionToken(token, SECRET, now)).toBe(false);
  });

  test("만료 시각을 조작한 토큰은 거부된다", () => {
    const [, sig] = createSessionToken(SECRET, now).split(".");
    const forged = `${now.getTime() + 365 * DAY}.${sig}`;
    expect(verifySessionToken(forged, SECRET, now)).toBe(false);
  });

  test("형식이 틀리거나 없는 토큰은 거부된다", () => {
    expect(verifySessionToken(undefined, SECRET, now)).toBe(false);
    expect(verifySessionToken("", SECRET, now)).toBe(false);
    expect(verifySessionToken("abc", SECRET, now)).toBe(false);
    expect(verifySessionToken("1.2.3", SECRET, now)).toBe(false);
  });
});

describe("관리자 비밀번호 확인", () => {
  test("같은 비밀번호만 통과한다", () => {
    expect(checkAdminPassword("s3cret!", "s3cret!")).toBe(true);
    expect(checkAdminPassword("s3cret", "s3cret!")).toBe(false);
    expect(checkAdminPassword("", "s3cret!")).toBe(false);
  });

  test("관리자 비밀번호가 설정되지 않았으면 아무것도 통과하지 않는다", () => {
    expect(checkAdminPassword("", undefined)).toBe(false);
    expect(checkAdminPassword("", "")).toBe(false);
  });
});

describe("세션 비밀키 정하기", () => {
  test("SESSION_SECRET이 있으면 그 값을 쓴다", () => {
    expect(resolveSessionSecret({ SESSION_SECRET: "s", ADMIN_PASSWORD: "p" })).toBe("s");
  });

  test("SESSION_SECRET이 없으면 관리자 비밀번호에서 만든 값을 쓰고, 비밀번호와는 다르다", () => {
    const secret = resolveSessionSecret({ ADMIN_PASSWORD: "p" });
    expect(secret).toBeTruthy();
    expect(secret).not.toBe("p");
    expect(resolveSessionSecret({ ADMIN_PASSWORD: "p" })).toBe(secret);
    expect(resolveSessionSecret({ ADMIN_PASSWORD: "q" })).not.toBe(secret);
  });

  test("둘 다 없으면 null", () => {
    expect(resolveSessionSecret({})).toBeNull();
  });
});
