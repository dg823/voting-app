"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatTimeLeft } from "@/lib/format";
import type { Option } from "@/lib/polls";

type Props = {
  pollId: string;
  options: Option[];
  closesAt: string | null;
  initiallyClosed: boolean;
};

export default function VoteForm({ pollId, options, closesAt, initiallyClosed }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closed, setClosed] = useState(initiallyClosed);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // 남은 시간 표시는 참고용이며, 실제 마감 판정은 서버(DB)가 한다(ADR-0002).
  useEffect(() => {
    if (!closesAt || initiallyClosed) return;
    const deadline = new Date(closesAt).getTime();
    const tick = () => {
      const ms = deadline - Date.now();
      setTimeLeft(formatTimeLeft(ms));
      if (ms <= 0) setClosed(true);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [closesAt, initiallyClosed]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (closed) return;
    if (!selected) return setError("선택지를 하나 골라 주세요.");

    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId: selected }),
    });
    if (res.ok) return router.push(`/polls/${pollId}/results`);

    const data = await res.json().catch(() => ({}));
    if (data.reason === "already_voted") return router.push(`/polls/${pollId}/results`);
    if (data.reason === "closed") setClosed(true);
    else setError(data.error ?? "투표하지 못했습니다.");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {closed ? (
        <p
          role="status"
          className="rounded-lg bg-gray-100 p-3 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          ⏰ 마감된 투표입니다. 결과만 볼 수 있어요.
        </p>
      ) : (
        timeLeft && <p className="text-sm font-medium text-orange-600">⏳ {timeLeft}</p>
      )}

      <fieldset disabled={closed} className="space-y-3 disabled:opacity-60">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/10 p-3 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:disabled]:cursor-not-allowed dark:border-white/15 dark:has-[:checked]:bg-blue-950"
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
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || closed}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {closed ? "투표 마감" : submitting ? "투표 중..." : "투표하기"}
      </button>
    </form>
  );
}
