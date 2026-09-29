import { adminOnly, isAdmin } from "@/lib/auth";
import { deletePoll, getPoll, getVoterNames, updatePoll } from "@/lib/polls";
import { publicPoll } from "@/lib/public-view";
import { validatePollInput } from "@/lib/validation";

const notFound = () => Response.json({ error: "투표를 찾을 수 없습니다." }, { status: 404 });

export async function GET(_request: Request, ctx: RouteContext<"/api/polls/[id]">) {
  const { id } = await ctx.params;
  const poll = await getPoll(id);
  if (!poll) return notFound();
  const view = publicPoll(poll, await isAdmin());
  const voterNames = !view.resultsHidden && !poll.isAnonymous ? await getVoterNames(id) : undefined;
  return Response.json({ ...view, voterNames });
}

type OptionPatch = { id?: unknown; label?: unknown };

export async function PATCH(request: Request, ctx: RouteContext<"/api/polls/[id]">) {
  const denied = await adminOnly();
  if (denied) return denied;

  const { id } = await ctx.params;
  const existing = await getPoll(id);
  if (!existing) return notFound();

  const body = await request.json().catch(() => null);
  const options: OptionPatch[] = Array.isArray(body?.options) ? body.options : [];
  const result = validatePollInput({ ...body, options: options.map((o) => o?.label) }, new Date(), {
    currentClosesAt: existing.closesAt,
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  const { options: labels, ...rest } = result.value;
  const outcome = await updatePoll(id, {
    ...rest,
    options: labels.map((label, i) => ({ id: String(options[i].id ?? ""), label })),
  });
  switch (outcome) {
    case "not_found":
      return notFound();
    case "settings_locked":
      return Response.json(
        { error: "이미 투표가 들어온 투표는 선택 방식과 공개 방식을 바꿀 수 없습니다." },
        { status: 400 },
      );
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
  if (!(await deletePoll(id))) return notFound();
  return Response.json({ ok: true });
}
