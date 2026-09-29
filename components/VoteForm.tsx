"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";
import type { Option, PollStatus, VoteRejectionReason } from "@/lib/polls";
import { MAX_VOTER_NAME_LENGTH } from "@/lib/voter-name";
import type { ChoiceMode } from "@/lib/validation";

type Props = {
  pollId: string;
  options: Pick<Option, "id" | "label">[];
  status: PollStatus;
  /** 다음 상태 변화 시각(예정이면 시작, 진행 중이면 마감). 남은 시간 표시용. */
  nextChangeAt: string | null;
  choiceMode: ChoiceMode;
  isAnonymous: boolean;
};

const STATUS_MESSAGE: Partial<Record<PollStatus, string>> = {
  scheduled: "⏳ 아직 시작 전인 투표입니다. 시작 시각이 되면 자동으로 열려요.",
  closed: "⏰ 마감된 투표입니다. 결과만 볼 수 있어요.",
};

export default function VoteForm({ pollId, options, status, nextChangeAt, choiceMode, isAnonymous }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [voterName, setVoterName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectedStatus, setRejectedStatus] = useState<PollStatus | null>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const currentStatus = rejectedStatus ?? status;
  const canVote = currentStatus === "open";
  const multiple = choiceMode === "multiple";

  // 남은 시간 표시는 참고용이다. 상태 전환은 RefreshWhenDue가 서버에 다시 물어 처리한다.
  useEffect(() => {
    if (!nextChangeAt) return;
    const due = new Date(nextChangeAt).getTime();
    const tick = () => {
      const ms = due - Date.now();
      setTimeLeft(ms > 0 ? formatDuration(ms) : null);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [nextChangeAt]);

  function toggle(optionId: string) {
    setSelected((prev) =>
      multiple ? (prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]) : [optionId],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canVote) return;
    if (selected.length === 0) return setError(multiple ? "선택지를 하나 이상 골라 주세요." : "선택지를 하나 골라 주세요.");
    if (!isAnonymous && !voterName.trim()) return setError("실명 투표입니다. 이름을 입력해 주세요.");

    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionIds: selected, voterName: isAnonymous ? null : voterName }),
    });
    if (res.ok) return router.push(`/polls/${pollId}/results`);

    const data: { error?: string; reason?: VoteRejectionReason } = await res.json().catch(() => ({}));
    if (data.reason === "already_voted" && isAnonymous) return router.push(`/polls/${pollId}/results`);
    if (data.reason === "closed") setRejectedStatus("closed");
    else if (data.reason === "not_open") setRejectedStatus("scheduled");
    else setError(data.error ?? "투표하지 못했습니다.");
    setSubmitting(false);
  }

  const statusMessage = STATUS_MESSAGE[currentStatus];

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {statusMessage && (
        <p
          role="status"
          className="rounded-lg bg-gray-100 p-3 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          {statusMessage}
          {currentStatus === "scheduled" && timeLeft && <span className="ml-1 text-amber-600">(약 {timeLeft} 후 시작)</span>}
        </p>
      )}
      {canVote && timeLeft && <p className="text-sm font-medium text-orange-600">⏳ 마감까지 {timeLeft} 남음</p>}

      <p className="text-sm text-gray-500">{multiple ? "여러 개를 고를 수 있어요." : "하나만 고를 수 있어요."}</p>

      <fieldset disabled={!canVote} className="space-y-3 disabled:opacity-60">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/10 p-3 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:disabled]:cursor-not-allowed dark:border-white/15 dark:has-[:checked]:bg-blue-950"
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name="option"
              value={option.id}
              checked={selected.includes(option.id)}
              onChange={() => toggle(option.id)}
            />
            {option.label}
          </label>
        ))}

        {!isAnonymous && (
          <label className="block pt-2">
            <span className="mb-1 block font-medium">
              이름 <span className="text-sm font-normal text-gray-500">(실명 투표: 결과에 이름이 공개돼요)</span>
            </span>
            <input
              className="w-full rounded-md border border-black/20 bg-transparent px-3 py-2 focus:border-blue-600 focus:outline-none dark:border-white/25"
              value={voterName}
              maxLength={MAX_VOTER_NAME_LENGTH}
              onChange={(e) => setVoterName(e.target.value)}
              placeholder="예: 홍길동"
            />
          </label>
        )}
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !canVote}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {currentStatus === "scheduled"
          ? "시작 전"
          : currentStatus === "closed"
            ? "투표 마감"
            : submitting
              ? "투표 중..."
              : "투표하기"}
      </button>
    </form>
  );
}
