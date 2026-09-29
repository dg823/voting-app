import Link from "next/link";
import PollSettingTags from "@/components/PollSettingTags";
import PollStatusBadge from "@/components/PollStatusBadge";
import RefreshWhenDue from "@/components/RefreshWhenDue";
import { formatDateTime, formatScheduleLabel, nextStatusChangeAt } from "@/lib/format";
import { isAdmin } from "@/lib/auth";
import { listPolls } from "@/lib/polls";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const polls = await listPolls();
  const admin = await isAdmin();
  // 목록의 투표 중 가장 먼저 상태가 바뀌는 시각에 목록을 다시 불러온다.
  const nextChange = polls
    .map(nextStatusChangeAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return (
    <section>
      <RefreshWhenDue at={nextChange?.toISOString() ?? null} />
      <h1 className="mb-6 text-2xl font-bold">전체 투표</h1>
      {polls.length === 0 ? (
        <p className="text-gray-500">
          아직 투표가 없습니다.{" "}
          {admin && (
            <Link href="/new" className="text-blue-600 underline">
              첫 투표를 만들어 보세요.
            </Link>
          )}
        </p>
      ) : (
        <ul className="space-y-3">
          {polls.map((poll) => (
            <li key={poll.id}>
              <Link
                href={`/polls/${poll.id}`}
                className="block rounded-lg border border-black/10 p-4 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{poll.question}</p>
                  <PollStatusBadge status={poll.status} />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  만든 날 {formatDateTime(poll.createdAt)} · {formatScheduleLabel(poll)}
                </p>
                <div className="mt-2">
                  <PollSettingTags poll={poll} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
