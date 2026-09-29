import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PollMeta from "@/components/PollMeta";
import VoteForm from "@/components/VoteForm";
import { getPoll } from "@/lib/polls";
import { votedCookieName } from "@/lib/vote-cookie";

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll) notFound();

  if ((await cookies()).has(votedCookieName(id))) redirect(`/polls/${id}/results`);

  return (
    <section>
      <PollMeta poll={poll} />
      <h1 className="mb-6 text-2xl font-bold">{poll.question}</h1>
      <VoteForm
        pollId={poll.id}
        options={poll.options}
        closesAt={poll.closesAt?.toISOString() ?? null}
        initiallyClosed={poll.isClosed}
      />
      <Link href={`/polls/${id}/results`} className="mt-6 inline-block text-sm text-blue-600 hover:underline">
        결과 보기 →
      </Link>
    </section>
  );
}
