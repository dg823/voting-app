import type { Results } from "@/lib/results";

// ADR-0003: 차트 라이브러리 없이 득표율(%)을 막대 너비로 쓰는 가로 막대그래프.
export default function ResultsChart({ results }: { results: Results }) {
  return (
    <figure>
      <ul className="space-y-4">
        {results.rows.map((row) => (
          <li key={row.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className={row.isLeader ? "font-bold" : "font-medium"}>
                {row.isLeader && <span aria-label="최다 득표">👑 </span>}
                {row.label}
              </span>
              <span className="shrink-0 text-sm tabular-nums text-gray-600 dark:text-gray-300">
                <span className="font-semibold text-gray-900 dark:text-gray-50">{row.share}%</span> · {row.votes}표
              </span>
            </div>
            <div
              role="img"
              aria-label={`${row.label}: ${row.votes}표, ${row.share}%`}
              className="h-7 w-full overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800"
            >
              <div
                className={`h-full rounded-md transition-[width] duration-700 ${
                  row.isLeader ? "bg-blue-600" : "bg-blue-300 dark:bg-blue-800"
                }`}
                style={{ width: `${row.share}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <figcaption className="mt-5 text-sm text-gray-500">
        {results.total === 0 ? "아직 투표가 없습니다." : `총 ${results.total}표`}
      </figcaption>
    </figure>
  );
}
