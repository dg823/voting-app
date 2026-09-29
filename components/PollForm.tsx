"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_OPTIONS, MIN_OPTIONS, validatePollInput } from "@/lib/validation";

const inputClass =
  "w-full rounded-md border border-black/20 bg-transparent px-3 py-2 focus:border-blue-600 focus:outline-none dark:border-white/25";

/** 수정 모드에서 받는 기존 투표. 선택지 개수는 바꿀 수 없다(득표 보존). */
export type EditablePoll = {
  id: string;
  question: string;
  options: { id: string; label: string }[];
  closesAt: string | null;
};

// datetime-local 입력은 브라우저 현지 시각 "YYYY-MM-DDTHH:mm" 형식을 쓴다.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PollForm({ editing }: { editing?: EditablePoll }) {
  const router = useRouter();
  const initialClosesAtLocal = toLocalInput(editing?.closesAt ?? null);
  const [question, setQuestion] = useState(editing?.question ?? "");
  const [options, setOptions] = useState(editing?.options.map((o) => o.label) ?? ["", ""]);
  const [closesAtLocal, setClosesAtLocal] = useState(initialClosesAtLocal);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // datetime-local 값은 브라우저 현지 시각이므로 ISO(UTC)로 바꿔 보낸다.
    // 수정 중 마감 시각을 건드리지 않았다면 기존 값을 그대로 보낸다(초 단위 보존).
    const closesAt =
      editing && closesAtLocal === initialClosesAtLocal
        ? editing.closesAt
        : closesAtLocal
          ? new Date(closesAtLocal).toISOString()
          : null;
    const check = validatePollInput({ question, options, closesAt }, new Date(), {
      currentClosesAt: editing?.closesAt ? new Date(editing.closesAt) : null,
    });
    if (!check.ok) return setError(check.error);

    setSubmitting(true);
    setError(null);
    const res = editing
      ? await fetch(`/api/polls/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            options: editing.options.map((o, i) => ({ id: o.id, label: options[i] })),
            closesAt,
          }),
        })
      : await fetch("/api/polls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, options, closesAt }),
        });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSubmitting(false);
      return setError(data.error ?? "저장하지 못했습니다.");
    }
    router.push(`/polls/${editing?.id ?? data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <label className="block">
        <span className="mb-1 block font-medium">질문</span>
        <input
          className={inputClass}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="예: 이번 MT 장소는?"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-medium">
          선택지{" "}
          <span className="text-sm font-normal text-gray-500">
            {editing ? "(이름만 수정할 수 있어요. 득표는 유지돼요)" : `(${MIN_OPTIONS}~${MAX_OPTIONS}개)`}
          </span>
        </legend>
        {options.map((option, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={inputClass}
              value={option}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`선택지 ${i + 1}`}
              aria-label={`선택지 ${i + 1}`}
            />
            {!editing && options.length > MIN_OPTIONS && (
              <button
                type="button"
                onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                className="rounded-md border border-black/20 px-3 text-sm dark:border-white/25"
                aria-label={`선택지 ${i + 1} 삭제`}
              >
                삭제
              </button>
            )}
          </div>
        ))}
        {!editing && options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, ""])}
            className="text-sm text-blue-600 hover:underline"
          >
            + 선택지 추가
          </button>
        )}
      </fieldset>

      <label className="block">
        <span className="mb-1 block font-medium">
          마감 시각 <span className="text-sm font-normal text-gray-500">(선택, 비워두면 마감 없음)</span>
        </span>
        <div className="flex gap-2">
          <input
            type="datetime-local"
            className={inputClass}
            value={closesAtLocal}
            onChange={(e) => setClosesAtLocal(e.target.value)}
          />
          {closesAtLocal && (
            <button
              type="button"
              onClick={() => setClosesAtLocal("")}
              className="rounded-md border border-black/20 px-3 text-sm dark:border-white/25"
            >
              지우기
            </button>
          )}
        </div>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "저장 중..." : editing ? "수정 저장" : "투표 만들기"}
      </button>
    </form>
  );
}
