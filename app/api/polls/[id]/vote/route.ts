import { cookies } from "next/headers";
import { castVote } from "@/lib/polls";
import { VOTED_COOKIE_MAX_AGE, votedCookieName } from "@/lib/vote-cookie";

export async function POST(request: Request, ctx: RouteContext<"/api/polls/[id]/vote">) {
  const { id } = await ctx.params;
  const cookieStore = await cookies();
  if (cookieStore.has(votedCookieName(id))) {
    return Response.json({ error: "이미 투표했습니다.", reason: "already_voted" }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const optionId = typeof body?.optionId === "string" ? body.optionId : "";

  const result = await castVote(id, optionId);
  switch (result) {
    case "not_found":
      return Response.json({ error: "투표를 찾을 수 없습니다." }, { status: 404 });
    case "closed":
      // ADR-0002: 화면에서 막더라도 서버가 최종적으로 거부한다.
      return Response.json({ error: "마감된 투표입니다.", reason: "closed" }, { status: 409 });
    case "invalid_option":
      return Response.json({ error: "선택지를 다시 골라 주세요." }, { status: 400 });
    case "ok":
      cookieStore.set(votedCookieName(id), "1", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: VOTED_COOKIE_MAX_AGE,
      });
      return Response.json({ ok: true });
  }
}
