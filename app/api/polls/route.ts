import { adminOnly } from "@/lib/auth";
import { createPoll, listPolls } from "@/lib/polls";
import { validatePollInput } from "@/lib/validation";

export async function GET() {
  return Response.json(await listPolls());
}

export async function POST(request: Request) {
  const denied = await adminOnly();
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const result = validatePollInput(body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  const id = await createPoll(result.value);
  return Response.json({ id }, { status: 201 });
}
