import { startAdminSession } from "@/lib/auth";
import { checkAdminPassword } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!checkAdminPassword(password, process.env.ADMIN_PASSWORD)) {
    return Response.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  await startAdminSession();
  return Response.json({ ok: true });
}
