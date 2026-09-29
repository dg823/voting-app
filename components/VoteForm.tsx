"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Option } from "@/lib/polls";

type Props = { pollId: string; options: Option[] };

export default function VoteForm({ pollId, options }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return setError("선택지를 하나 골라 주세요.");

    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId: selected }),
    });
    // 409(이미 투표함)도 결과 화면으로 보낸다.
    if (res.ok || res.status === 409) return router.push(`/polls/${pollId}/results`);

    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "투표하지 못했습니다.");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/10 p-3 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:border-white/15 dark:has-[:checked]:bg-blue-950"
        >
          <input
            type="radio"
            name="option"
            value={option.id}
            checked={selected === option.id}
            onChange={() => setSelected(option.id)}
          />
          {option.label}
        </label>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "투표 중..." : "투표하기"}
      </button>
    </form>
  );
}
