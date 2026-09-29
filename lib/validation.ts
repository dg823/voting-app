export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 5;

export type PollInput = { question: string; options: string[]; closesAt: Date | null };

export type ValidationResult =
  | { ok: true; value: PollInput }
  | { ok: false; error: string };

/** 수정할 때 넘기는 기존 값. 이미 지난 기존 마감 시각은 그대로 두는 것만 허용한다. */
export type ValidationContext = { currentClosesAt?: Date | null };

export function validatePollInput(
  raw: unknown,
  now: Date = new Date(),
  { currentClosesAt = null }: ValidationContext = {},
): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  const { question, options, closesAt } = raw as Record<string, unknown>;
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

  // 마감 시각은 선택 입력: 비어 있으면 무기한 진행.
  let parsedClosesAt: Date | null = null;
  if (closesAt !== undefined && closesAt !== null && closesAt !== "") {
    if (typeof closesAt !== "string" || Number.isNaN(Date.parse(closesAt))) {
      return { ok: false, error: "마감 시각 형식이 올바르지 않습니다." };
    }
    parsedClosesAt = new Date(closesAt);
    const unchanged = currentClosesAt?.getTime() === parsedClosesAt.getTime();
    if (parsedClosesAt <= now && !unchanged) return { ok: false, error: "마감 시각은 현재 이후여야 합니다." };
  }

  return { ok: true, value: { question: trimmedQuestion, options: trimmedOptions, closesAt: parsedClosesAt } };
}
