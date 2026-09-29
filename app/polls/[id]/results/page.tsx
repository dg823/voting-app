import Link from "next/link";
import { notFound } from "next/navigation";
import PollStatusBadge from "@/components/PollStatusBadge";
import ResultsChart from "@/components/ResultsChart";
import { formatClosingLabel } from "@/lib/format";
import { getPoll } from "@/lib/polls";
import { computeResults } from "@/lib/results";

export default async function ResultsPage({ params }: PageProps<"/polls/[id]/results">) {
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll) notFound();

  const results = computeResults(poll.options);

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <PollStatusBadge isClosed={poll.isClosed} />
        <span className="text-sm text-gray-500">
          {poll.isClosed ? "최종 결과" : "현재 결과"}
          {poll.closesAt && ` · ${formatClosingLabel(poll.closesAt)}`}
        </span>
      </div>
      <h1 className="mb-8 text-2xl font-bold">{poll.question}</h1>
      <ResultsChart results={results} />
      <Link href="/" className="mt-8 inline-block text-sm text-blue-600 hover:underline">
        ← 목록으로
      </Link>
    </section>
  );
}
