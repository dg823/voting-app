import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PollStatusBadge from "@/components/PollStatusBadge";
import VoteForm from "@/components/VoteForm";
import { formatDateTime } from "@/lib/format";
import { getPoll } from "@/lib/polls";
import { votedCookieName } from "@/lib/vote-cookie";

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll) notFound();

  if ((await cookies()).has(votedCookieName(id))) redirect(`/polls/${id}/results`);

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <PollStatusBadge isClosed={poll.isClosed} />
        <span className="text-sm text-gray-500">
          {poll.closesAt ? `마감 ${formatDateTime(poll.closesAt)}` : "마감 없음"}
        </span>
      </div>
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
