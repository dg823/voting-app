import type { PollSummary } from "@/lib/polls";

type Props = { poll: Pick<PollSummary, "choiceMode" | "isAnonymous" | "resultsAfterClose"> };

// 목록·투표 화면에서 투표 설정을 작은 태그로 보여준다. 기본값(익명·단일·항상 공개)은 생략한다.
export default function PollSettingTags({ poll }: Props) {
  const tags = [
    poll.choiceMode === "multiple" && "복수 선택",
    !poll.isAnonymous && "실명 투표",
    poll.resultsAfterClose && "마감 후 결과 공개",
  ].filter(Boolean) as string[];
  if (tags.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded border border-black/15 px-1.5 py-0.5 text-xs text-gray-600 dark:border-white/20 dark:text-gray-300"
        >
          {tag}
        </span>
      ))}
    </span>
  );
}
