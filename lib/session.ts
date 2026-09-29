import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// ADR-0004: 관리자 세션 = "만료시각(ms).HMAC서명". DB 세션 테이블 없이 서명만 검증한다.
export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(`admin:${payload}`).digest("base64url");

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function createSessionToken(secret: string, now: Date = new Date()): string {
  const expiresAt = String(now.getTime() + SESSION_TTL_MS);
  return `${expiresAt}.${sign(expiresAt, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string, now: Date = new Date()): boolean {
  const parts = token?.split(".") ?? [];
  if (parts.length !== 2) return false;
  const [expiresAt, signature] = parts;
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) <= now.getTime()) return false;
  return safeEqual(signature, sign(expiresAt, secret));
}

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/**
 * 세션 서명 비밀키. SESSION_SECRET이 없으면 관리자 비밀번호에서 파생한다(ADR-0004).
 * 이 경우 관리자 비밀번호를 바꾸면 모든 관리자 세션이 무효가 된다.
 */
export function resolveSessionSecret(env: { SESSION_SECRET?: string; ADMIN_PASSWORD?: string }): string | null {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  if (!env.ADMIN_PASSWORD) return null;
  return createHmac("sha256", "voting-app-session-key").update(env.ADMIN_PASSWORD).digest("base64url");
}

export function checkAdminPassword(input: string, expected: string | undefined): boolean {
  if (!expected) return false;
  // 같은 길이의 해시끼리 비교해 비밀번호 길이도 타이밍으로 새지 않게 한다.
  return timingSafeEqual(sha256(input), sha256(expected));
}
