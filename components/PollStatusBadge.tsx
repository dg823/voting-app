const base = "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium";

export default function PollStatusBadge({ isClosed }: { isClosed: boolean }) {
  return isClosed ? (
    <span className={`${base} bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200`}>마감됨</span>
  ) : (
    <span className={`${base} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100`}>진행 중</span>
  );
}
