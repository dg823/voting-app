import { getPoll } from "@/lib/polls";

export async function GET(_request: Request, ctx: RouteContext<"/api/polls/[id]">) {
  const { id } = await ctx.params;
  const poll = await getPoll(id);
  if (!poll) return Response.json({ error: "투표를 찾을 수 없습니다." }, { status: 404 });
  return Response.json(poll);
}
