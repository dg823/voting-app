import PollForm from "@/components/PollForm";
import { requireAdmin } from "@/lib/auth";

export default async function NewPollPage() {
  await requireAdmin("/new");

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold">새 투표 만들기</h1>
      <PollForm />
    </section>
  );
}
