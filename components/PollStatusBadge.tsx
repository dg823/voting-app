import type { PollStatus } from "@/lib/polls";

const base = "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium";
const STYLES: Record<PollStatus, { label: string; className: string }> = {
  scheduled: { label: "예정", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  open: { label: "진행 중", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  closed: { label: "마감됨", className: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200" },
};

export default function PollStatusBadge({ status }: { status: PollStatus }) {
  const { label, className } = STYLES[status];
  return <span className={`${base} ${className}`}>{label}</span>;
}
