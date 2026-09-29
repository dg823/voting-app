import { adminOnly } from "@/lib/auth";
import { deletePoll, getPoll, updatePoll } from "@/lib/polls";
import { validatePollInput } from "@/lib/validation";

export async function GET(_request: Request, ctx: RouteContext<"/api/polls/[id]">) {
  const { id } = await ctx.params;
  const poll = await getPoll(id);
  if (!poll) return Response.json({ error: "투표를 찾을 수 없습니다." }, { status: 404 });
  return Response.json(poll);
}

type OptionPatch = { id?: unknown; label?: unknown };

export async function PATCH(request: Request, ctx: RouteContext<"/api/polls/[id]">) {
  const denied = await adminOnly();
  if (denied) return denied;

  const { id } = await ctx.params;
  const existing = await getPoll(id);
  if (!existing) return Response.json({ error: "투표를 찾을 수 없습니다." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const options: OptionPatch[] = Array.isArray(body?.options) ? body.options : [];
  const result = validatePollInput(
    { question: body?.question, options: options.map((o) => o?.label), closesAt: body?.closesAt },
    new Date(),
    { currentClosesAt: existing.closesAt },
  );
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  const outcome = await updatePoll(id, {
    question: result.value.question,
    options: result.value.options.map((label, i) => ({ id: String(options[i].id ?? ""), label })),
    closesAt: result.value.closesAt,
  });
  switch (outcome) {
    case "not_found":
      return Response.json({ error: "투표를 찾을 수 없습니다." }, { status: 404 });
    case "invalid_option":
      return Response.json({ error: "선택지 정보가 맞지 않습니다. 새로고침 후 다시 시도하세요." }, { status: 400 });
    case "ok":
      return Response.json({ ok: true });
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/polls/[id]">) {
  const denied = await adminOnly();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!(await deletePoll(id))) return Response.json({ error: "투표를 찾을 수 없습니다." }, { status: 404 });
  return Response.json({ ok: true });
}
