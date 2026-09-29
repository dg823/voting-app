import { describe, expect, test } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("로그인 후 돌아갈 경로", () => {
  test("앱 내부 경로는 그대로 쓴다", () => {
    expect(safeRedirectPath("/new")).toBe("/new");
    expect(safeRedirectPath("/polls/abc/edit?x=1")).toBe("/polls/abc/edit?x=1");
  });

  test("외부로 나가는 경로는 모두 /로 바꾼다", () => {
    const bads = [
      "https://evil.com",
      "//evil.com",
      String.raw`/\evil.com`,
      "/\t/evil.com",
      String.raw`\\evil.com`,
      "javascript:alert(1)",
    ];
    for (const bad of bads) {
      expect(safeRedirectPath(bad)).toBe("/");
    }
  });

  test("값이 없거나 여러 개면 /", () => {
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath(["/a", "/b"])).toBe("/");
  });
});
