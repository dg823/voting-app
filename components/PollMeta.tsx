import PollSettingTags from "@/components/PollSettingTags";
import PollStatusBadge from "@/components/PollStatusBadge";
import { formatScheduleLabel } from "@/lib/format";
import type { PollSummary } from "@/lib/polls";

type Props = {
  poll: Pick<
    PollSummary,
    "status" | "opensAt" | "closesAt" | "choiceMode" | "isAnonymous" | "resultsAfterClose"
  >;
  /** 일정 앞에 붙는 말(예: "최종 결과"). */
  label?: string;
};

// 투표·결과 화면 제목 위의 "상태 배지 + 일정 + 설정 태그" 한 줄.
export default function PollMeta({ poll, label }: Props) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <PollStatusBadge status={poll.status} />
      <span className="text-sm text-gray-500">{[label, formatScheduleLabel(poll)].filter(Boolean).join(" · ")}</span>
      <PollSettingTags poll={poll} />
    </div>
  );
}
