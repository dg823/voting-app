import Link from "next/link";
import { notFound } from "next/navigation";
import { getPoll } from "@/lib/polls";

export default async function ResultsPage({ params }: PageProps<"/polls/[id]/results">) {
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll) notFound();

  const total = poll.options.reduce((sum, o) => sum + o.votes, 0);

  return (
    <section>
      <p className="mb-1 text-sm text-gray-500">결과</p>
      <h1 className="mb-6 text-2xl font-bold">{poll.question}</h1>
      <ul className="space-y-2">
        {poll.options.map((option) => (
          <li key={option.id} className="flex justify-between rounded-lg border border-black/10 p-3 dark:border-white/15">
            <span>{option.label}</span>
            <span className="font-medium">{option.votes}표</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-gray-500">총 {total}표</p>
      <Link href="/" className="mt-6 inline-block text-sm text-blue-600 hover:underline">
        ← 목록으로
      </Link>
    </section>
  );
}
