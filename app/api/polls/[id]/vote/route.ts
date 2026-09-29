import { cookies } from "next/headers";
import { castVote, type VoteRejectionReason } from "@/lib/polls";
import { VOTED_COOKIE_MAX_AGE, votedCookieName } from "@/lib/vote-cookie";

const reject = (status: number, error: string, reason?: VoteRejectionReason) =>
  Response.json(reason ? { error, reason } : { error }, { status });

export async function POST(request: Request, ctx: RouteContext<"/api/polls/[id]/vote">) {
  const { id } = await ctx.params;
  const cookieStore = await cookies();
  if (cookieStore.has(votedCookieName(id))) return reject(409, "이미 투표했습니다.", "already_voted");

  const body = await request.json().catch(() => null);
  // optionId(단일, 이전 형식)와 optionIds(목록) 모두 받는다.
  const optionIds: string[] = Array.isArray(body?.optionIds)
    ? body.optionIds.filter((v: unknown): v is string => typeof v === "string")
    : typeof body?.optionId === "string"
      ? [body.optionId]
      : [];
  const voterName = typeof body?.voterName === "string" ? body.voterName : null;

  const result = await castVote(id, { optionIds, voterName });
  switch (result) {
    case "not_found":
      return reject(404, "투표를 찾을 수 없습니다.");
    // ADR-0002/0005: 화면에서 막더라도 서버가 최종적으로 거부한다.
    case "not_open":
      return reject(409, "아직 시작하지 않은 투표입니다.", "not_open");
    case "closed":
      return reject(409, "마감된 투표입니다.", "closed");
    case "name_required":
      return reject(400, "실명 투표입니다. 이름을 1~20자로 입력해 주세요.");
    case "name_taken":
      return reject(409, "이 이름으로 이미 투표했습니다.", "already_voted");
    case "invalid_option":
      return reject(400, "선택지를 다시 골라 주세요.");
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
