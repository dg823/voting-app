import PollStatusBadge from "@/components/PollStatusBadge";
import { formatClosingLabel } from "@/lib/format";
import type { PollSummary } from "@/lib/polls";

type Props = { poll: Pick<PollSummary, "isClosed" | "closesAt">; prefix?: string };

// 투표·결과 화면 제목 위의 "상태 배지 + 마감 시각" 한 줄.
export default function PollMeta({ poll, prefix }: Props) {
  // 앞말(예: "최종 결과")이 있으면 "마감 없음"은 생략한다.
  const closing = prefix && !poll.closesAt ? null : formatClosingLabel(poll.closesAt);
  const parts = [prefix, closing].filter(Boolean);
  return (
    <div className="mb-2 flex items-center gap-2">
      <PollStatusBadge isClosed={poll.isClosed} />
      <span className="text-sm text-gray-500">{parts.join(" · ")}</span>
    </div>
  );
}
