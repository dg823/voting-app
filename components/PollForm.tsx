"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_OPTIONS, MIN_OPTIONS, type ChoiceMode, validatePollInput } from "@/lib/validation";

const inputClass =
  "w-full rounded-md border border-black/20 bg-transparent px-3 py-2 focus:border-blue-600 focus:outline-none dark:border-white/25";

/** 수정 모드에서 받는 기존 투표. 선택지 개수는 바꿀 수 없다(득표 보존). */
export type EditablePoll = {
  id: string;
  question: string;
  options: { id: string; label: string }[];
  opensAt: string | null;
  closesAt: string | null;
  choiceMode: ChoiceMode;
  isAnonymous: boolean;
  resultsAfterClose: boolean;
  /** 투표가 들어와 선택 방식·공개 방식을 바꿀 수 없는지(ADR-0005). */
  settingsLocked: boolean;
};

// datetime-local 입력은 브라우저 현지 시각 "YYYY-MM-DDTHH:mm" 형식을 쓴다.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 현지 시각 입력값을 ISO(UTC)로 바꾼다. 수정 중 건드리지 않았다면 기존 값을 그대로 둔다(초 단위 보존). */
function toIso(local: string, originalIso: string | null): string | null {
  if (local === toLocalInput(originalIso)) return originalIso;
  return local ? new Date(local).toISOString() : null;
}

function DateTimeField(props: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block font-medium">
        {props.label} <span className="text-sm font-normal text-gray-500">({props.hint})</span>
      </span>
      <div className="flex gap-2">
        <input
          type="datetime-local"
          className={inputClass}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
        />
        {props.value && (
          <button
            type="button"
            onClick={() => props.onChange("")}
            className="rounded-md border border-black/20 px-3 text-sm dark:border-white/25"
          >
            지우기
          </button>
        )}
      </div>
    </label>
  );
}

function Choice<T extends string | boolean>(props: {
  legend: string;
  value: T;
  onChange: (v: T) => void;
  choices: { value: T; label: string; hint: string }[];
  disabledReason?: string;
}) {
  return (
    <fieldset disabled={Boolean(props.disabledReason)} className="space-y-2">
      <legend className="mb-1 font-medium">{props.legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {props.choices.map((c) => (
          <label
            key={String(c.value)}
            className="flex cursor-pointer gap-2 rounded-lg border border-black/10 p-3 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 dark:border-white/15 dark:has-[:checked]:bg-blue-950"
          >
            <input
              type="radio"
              name={props.legend}
              checked={props.value === c.value}
              onChange={() => props.onChange(c.value)}
            />
            <span>
              <span className="block text-sm font-medium">{c.label}</span>
              <span className="block text-xs text-gray-500">{c.hint}</span>
            </span>
          </label>
        ))}
      </div>
      {props.disabledReason && <p className="text-xs text-gray-500">🔒 {props.disabledReason}</p>}
    </fieldset>
  );
}

export default function PollForm({ editing }: { editing?: EditablePoll }) {
  const router = useRouter();
  const [question, setQuestion] = useState(editing?.question ?? "");
  const [options, setOptions] = useState(editing?.options.map((o) => o.label) ?? ["", ""]);
  const [opensAtLocal, setOpensAtLocal] = useState(toLocalInput(editing?.opensAt ?? null));
  const [closesAtLocal, setClosesAtLocal] = useState(toLocalInput(editing?.closesAt ?? null));
  const [choiceMode, setChoiceMode] = useState<ChoiceMode>(editing?.choiceMode ?? "single");
  const [isAnonymous, setIsAnonymous] = useState(editing?.isAnonymous ?? true);
  const [resultsAfterClose, setResultsAfterClose] = useState(editing?.resultsAfterClose ?? false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lockedReason = editing?.settingsLocked ? "이미 투표가 들어와서 바꿀 수 없어요." : undefined;

  function setOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const settings = {
      opensAt: toIso(opensAtLocal, editing?.opensAt ?? null),
      closesAt: toIso(closesAtLocal, editing?.closesAt ?? null),
      choiceMode,
      isAnonymous,
      resultsAfterClose,
    };
    const check = validatePollInput({ question, options, ...settings }, new Date(), {
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
            ...settings,
          }),
        })
      : await fetch("/api/polls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, options, ...settings }),
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
    <form onSubmit={handleSubmit} className="space-y-8">
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

      <div className="space-y-4">
        <DateTimeField label="시작 시각" hint="선택, 비워두면 바로 시작" value={opensAtLocal} onChange={setOpensAtLocal} />
        <DateTimeField
          label="마감 시각"
          hint="선택, 비워두면 마감 없음"
          value={closesAtLocal}
          onChange={setClosesAtLocal}
        />
      </div>

      <Choice
        legend="선택 방식"
        value={choiceMode}
        onChange={setChoiceMode}
        disabledReason={lockedReason}
        choices={[
          { value: "single", label: "1인 1표 (하나만)", hint: "선택지 하나만 고를 수 있어요" },
          { value: "multiple", label: "복수 선택", hint: "여러 개를 고를 수 있어요" },
        ]}
      />
      <Choice
        legend="공개 방식"
        value={isAnonymous}
        onChange={setIsAnonymous}
        disabledReason={lockedReason}
        choices={[
          { value: true, label: "익명 투표", hint: "누가 무엇을 골랐는지 남기지 않아요" },
          { value: false, label: "실명 투표", hint: "이름을 받고, 결과에 명단이 보여요" },
        ]}
      />
      <Choice
        legend="결과 공개"
        value={resultsAfterClose}
        onChange={setResultsAfterClose}
        choices={[
          { value: false, label: "항상 공개", hint: "투표 중에도 결과를 볼 수 있어요" },
          { value: true, label: "마감 후 자동 공개", hint: "마감 시각이 되면 자동으로 공개돼요" },
        ]}
      />

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
