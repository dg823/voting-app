import { createHmac, timingSafeEqual } from "node:crypto";

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

export function checkAdminPassword(input: string, expected: string | undefined): boolean {
  if (!expected) return false;
  return safeEqual(input, expected);
}
