export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 5;

export type ChoiceMode = "single" | "multiple";
const CHOICE_MODES: readonly ChoiceMode[] = ["single", "multiple"];

export type PollSettings = {
  opensAt: Date | null;
  closesAt: Date | null;
  choiceMode: ChoiceMode;
  isAnonymous: boolean;
  resultsAfterClose: boolean;
};

export type PollInput = { question: string; options: string[] } & PollSettings;

export type ValidationResult =
  | { ok: true; value: PollInput }
  | { ok: false; error: string };

/** 수정할 때 넘기는 기존 값. 이미 지난 기존 마감 시각은 그대로 두는 것만 허용한다. */
export type ValidationContext = { currentClosesAt?: Date | null };

const fail = (error: string): ValidationResult => ({ ok: false, error });

/** 비어 있으면 null, 날짜로 읽을 수 없으면 undefined. */
function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value);
}

export function validatePollInput(
  raw: unknown,
  now: Date = new Date(),
  { currentClosesAt = null }: ValidationContext = {},
): ValidationResult {
  if (typeof raw !== "object" || raw === null) return fail("잘못된 요청입니다.");
  const { question, options, opensAt, closesAt, choiceMode, isAnonymous, resultsAfterClose } = raw as Record<
    string,
    unknown
  >;
  if (typeof question !== "string" || !Array.isArray(options)) return fail("잘못된 요청입니다.");

  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) return fail("질문을 입력하세요.");

  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    return fail(`선택지는 ${MIN_OPTIONS}~${MAX_OPTIONS}개여야 합니다.`);
  }
  const trimmedOptions = options.map((o) => (typeof o === "string" ? o.trim() : ""));
  if (trimmedOptions.some((o) => !o)) return fail("빈 선택지가 있습니다.");

  // 시작 시각은 선택 입력: 비어 있거나 이미 지났으면 즉시 시작.
  const parsedOpensAt = parseOptionalDate(opensAt);
  if (parsedOpensAt === undefined) return fail("시작 시각 형식이 올바르지 않습니다.");

  // 마감 시각은 선택 입력: 비어 있으면 무기한 진행.
  const parsedClosesAt = parseOptionalDate(closesAt);
  if (parsedClosesAt === undefined) return fail("마감 시각 형식이 올바르지 않습니다.");
  if (parsedClosesAt) {
    const unchanged = currentClosesAt?.getTime() === parsedClosesAt.getTime();
    if (parsedClosesAt <= now && !unchanged) return fail("마감 시각은 현재 이후여야 합니다.");
  }
  if (parsedOpensAt && parsedClosesAt && parsedOpensAt >= parsedClosesAt) {
    return fail("시작 시각은 마감 시각보다 앞서야 합니다.");
  }

  const mode = choiceMode ?? "single";
  if (!CHOICE_MODES.includes(mode as ChoiceMode)) return fail("선택 방식이 올바르지 않습니다.");
  if (isAnonymous !== undefined && typeof isAnonymous !== "boolean") return fail("공개 방식이 올바르지 않습니다.");
  if (resultsAfterClose !== undefined && typeof resultsAfterClose !== "boolean") {
    return fail("결과 공개 시점이 올바르지 않습니다.");
  }
  if (resultsAfterClose && !parsedClosesAt) return fail("마감 후 결과를 공개하려면 마감 시각을 정해야 합니다.");

  return {
    ok: true,
    value: {
      question: trimmedQuestion,
      options: trimmedOptions,
      opensAt: parsedOpensAt,
      closesAt: parsedClosesAt,
      choiceMode: mode as ChoiceMode,
      isAnonymous: isAnonymous ?? true,
      resultsAfterClose: resultsAfterClose ?? false,
    },
  };
}
