import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSessionToken,
  resolveSessionSecret,
  verifySessionToken,
} from "./session";

// ADR-0004: 권한 검사는 페이지와 API 양쪽에서 이 모듈로 한다.
const sessionSecret = () =>
  resolveSessionSecret({
    SESSION_SECRET: process.env.SESSION_SECRET,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  });

// 비밀키가 없으면 아무도 관리자가 아닐 뿐, 투표자 화면은 계속 동작해야 한다.
export async function isAdmin(): Promise<boolean> {
  const secret = sessionSecret();
  if (!secret) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, secret);
}

/** 페이지용: 관리자가 아니면 로그인 화면으로 보낸다. */
export async function requireAdmin(returnTo: string): Promise<void> {
  if (!(await isAdmin())) redirect(`/admin/login?next=${encodeURIComponent(returnTo)}`);
}

/** API용: 관리자가 아니면 401 응답을, 관리자면 null을 돌려준다. */
export async function adminOnly(): Promise<Response | null> {
  if (await isAdmin()) return null;
  return Response.json({ error: "관리자만 할 수 있습니다." }, { status: 401 });
}

export async function startAdminSession(): Promise<void> {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD가 설정되지 않았습니다.");
  (await cookies()).set(SESSION_COOKIE, createSessionToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
