import { notFound } from "next/navigation";
import PollForm from "@/components/PollForm";
import { requireAdmin } from "@/lib/auth";
import { getPoll } from "@/lib/polls";

export default async function EditPollPage({ params }: PageProps<"/polls/[id]/edit">) {
  const { id } = await params;
  await requireAdmin(`/polls/${id}/edit`);
  const poll = await getPoll(id);
  if (!poll) notFound();

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold">투표 수정</h1>
      <PollForm
        editing={{
          id: poll.id,
          question: poll.question,
          options: poll.options.map(({ id, label }) => ({ id, label })),
          opensAt: poll.opensAt?.toISOString() ?? null,
          closesAt: poll.closesAt?.toISOString() ?? null,
          choiceMode: poll.choiceMode,
          isAnonymous: poll.isAnonymous,
          resultsAfterClose: poll.resultsAfterClose,
          settingsLocked: poll.ballotCount > 0,
        }}
      />
    </section>
  );
}
