import Link from "next/link";
import PollStatusBadge from "@/components/PollStatusBadge";
import { formatClosingLabel } from "@/lib/format";
import { listPolls } from "@/lib/polls";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const polls = await listPolls();

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold">전체 투표</h1>
      {polls.length === 0 ? (
        <p className="text-gray-500">
          아직 투표가 없습니다.{" "}
          <Link href="/new" className="text-blue-600 underline">
            첫 투표를 만들어 보세요.
          </Link>
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
                  <PollStatusBadge isClosed={poll.isClosed} />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {formatClosingLabel(poll.closesAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
