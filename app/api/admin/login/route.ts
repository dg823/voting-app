import { startAdminSession } from "@/lib/auth";
import { checkAdminPassword } from "@/lib/session";

// 실패 시 잠깐 기다려 비밀번호 무차별 대입 속도를 늦춘다.
const FAILED_LOGIN_DELAY_MS = 500;

export async function POST(request: Request) {
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
    return Response.json(
      { error: "관리자 로그인이 설정되지 않았습니다. ADMIN_PASSWORD와 SESSION_SECRET을 확인하세요." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!checkAdminPassword(password, process.env.ADMIN_PASSWORD)) {
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
    return Response.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  await startAdminSession();
  return Response.json({ ok: true });
}
