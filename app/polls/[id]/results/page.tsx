import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import AdminPollActions from "@/components/AdminPollActions";
import PollMeta from "@/components/PollMeta";
import RefreshWhenDue from "@/components/RefreshWhenDue";
import ResultsChart from "@/components/ResultsChart";
import { isAdmin } from "@/lib/auth";
import { formatDateTime, nextStatusChangeAt } from "@/lib/format";
import { getPoll, getVoterNames } from "@/lib/polls";
import { canSeeResults, computeResults } from "@/lib/results";
import { votedCookieName } from "@/lib/vote-cookie";

export default async function ResultsPage({ params }: PageProps<"/polls/[id]/results">) {
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll) notFound();
  const admin = await isAdmin();
  const visibleToEveryone = canSeeResults(poll, false);
  const visible = canSeeResults(poll, admin);
  const voted = (await cookies()).has(votedCookieName(id));

  return (
    <section>
      {/* 예약 시작·마감 시각이 되면 다시 불러온다: 마감 후 공개 투표는 이때 결과가 자동으로 보인다. */}
      <RefreshWhenDue at={nextStatusChangeAt(poll)?.toISOString() ?? null} />
      {admin && <AdminPollActions pollId={poll.id} question={poll.question} />}
      <PollMeta poll={poll} label={poll.status === "closed" ? "최종 결과" : "현재 결과"} />
      <h1 className="mb-8 text-2xl font-bold">{poll.question}</h1>

      {voted && !visibleToEveryone && (
        <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
          ✅ 투표가 접수되었습니다.
        </p>
      )}

      {visible ? (
        <>
          {!visibleToEveryone && (
            <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              👀 관리자 미리보기입니다. 투표자에게는 마감 후에 공개돼요.
            </p>
          )}
          <ResultsChart
            results={computeResults(poll.options, poll.ballotCount)}
            multiple={poll.choiceMode === "multiple"}
            voterNames={poll.isAnonymous ? undefined : await getVoterNames(poll.id)}
          />
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-black/20 p-8 text-center dark:border-white/25">
          <p className="text-lg font-medium">🔒 결과는 마감 후 공개됩니다</p>
          {poll.closesAt && (
            <p className="mt-2 text-sm text-gray-500">
              공개 예정: {formatDateTime(poll.closesAt)} (시간이 되면 자동으로 보여요)
            </p>
          )}
        </div>
      )}

      <div className="mt-8 flex gap-4 text-sm">
        <Link href="/" className="text-blue-600 hover:underline">
          ← 목록으로
        </Link>
        {!voted && poll.status !== "closed" && (
          <Link href={`/polls/${id}`} className="text-blue-600 hover:underline">
            투표하러 가기 →
          </Link>
        )}
      </div>
    </section>
  );
}
