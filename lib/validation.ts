export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 5;

export type PollInput = { question: string; options: string[] };

export type ValidationResult =
  | { ok: true; value: PollInput }
  | { ok: false; error: string };

export function validatePollInput(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  const { question, options } = raw as Record<string, unknown>;
  if (typeof question !== "string" || !Array.isArray(options)) {
    return { ok: false, error: "잘못된 요청입니다." };
  }

  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) return { ok: false, error: "질문을 입력하세요." };

  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    return { ok: false, error: `선택지는 ${MIN_OPTIONS}~${MAX_OPTIONS}개여야 합니다.` };
  }
  const trimmedOptions = options.map((o) => (typeof o === "string" ? o.trim() : ""));
  if (trimmedOptions.some((o) => !o)) {
    return { ok: false, error: "빈 선택지가 있습니다." };
  }

  return { ok: true, value: { question: trimmedQuestion, options: trimmedOptions } };
}
