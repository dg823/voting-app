import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import AdminPollActions from "@/components/AdminPollActions";
import PollMeta from "@/components/PollMeta";
import RefreshWhenDue from "@/components/RefreshWhenDue";
import VoteForm from "@/components/VoteForm";
import { isAdmin } from "@/lib/auth";
import { nextStatusChangeAt } from "@/lib/format";
import { getPoll } from "@/lib/polls";
import { votedCookieName } from "@/lib/vote-cookie";

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll) notFound();
  const admin = await isAdmin();

  if ((await cookies()).has(votedCookieName(id))) redirect(`/polls/${id}/results`);
  const nextChange = nextStatusChangeAt(poll)?.toISOString() ?? null;

  return (
    <section>
      <RefreshWhenDue at={nextChange} />
      {admin && <AdminPollActions pollId={poll.id} question={poll.question} />}
      <PollMeta poll={poll} />
      <h1 className="mb-6 text-2xl font-bold">{poll.question}</h1>
      <VoteForm
        // 서버가 판정한 상태가 바뀌면(예정→진행 중 등) 폼을 새로 만들어 이전 거부 상태를 지운다.
        key={poll.status}
        pollId={poll.id}
        // 득표수는 넘기지 않는다: 마감 후 공개 투표의 결과가 브라우저로 새지 않게.
        options={poll.options.map(({ id, label }) => ({ id, label }))}
        status={poll.status}
        nextChangeAt={nextChange}
        choiceMode={poll.choiceMode}
        isAnonymous={poll.isAnonymous}
      />
      <Link href={`/polls/${id}/results`} className="mt-6 inline-block text-sm text-blue-600 hover:underline">
        결과 보기 →
      </Link>
    </section>
  );
}
