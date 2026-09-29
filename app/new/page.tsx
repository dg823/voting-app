import CreatePollForm from "@/components/CreatePollForm";

export default function NewPollPage() {
  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold">새 투표 만들기</h1>
      <CreatePollForm />
    </section>
  );
}
