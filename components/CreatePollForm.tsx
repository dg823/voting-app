"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_OPTIONS, MIN_OPTIONS, validatePollInput } from "@/lib/validation";

const inputClass =
  "w-full rounded-md border border-black/20 bg-transparent px-3 py-2 focus:border-blue-600 focus:outline-none dark:border-white/25";

export default function CreatePollForm() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const input = { question, options };
    const check = validatePollInput(input);
    if (!check.ok) return setError(check.error);

    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      setSubmitting(false);
      return setError(data.error ?? "투표를 만들지 못했습니다.");
    }
    router.push(`/polls/${data.id}`);
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
          선택지 ({MIN_OPTIONS}~{MAX_OPTIONS}개)
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
            {options.length > MIN_OPTIONS && (
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
        {options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, ""])}
            className="text-sm text-blue-600 hover:underline"
          >
            + 선택지 추가
          </button>
        )}
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "만드는 중..." : "투표 만들기"}
      </button>
    </form>
  );
}
