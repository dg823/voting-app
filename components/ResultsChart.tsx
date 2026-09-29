import type { Results } from "@/lib/results";

type Props = {
  results: Results;
  multiple: boolean;
  /** 실명 투표일 때 선택지별 투표자 이름. 익명이면 생략. */
  voterNames?: Record<string, string[]>;
};

// ADR-0003: 차트 라이브러리 없이 득표율(%)을 막대 너비로 쓰는 가로 막대그래프.
export default function ResultsChart({ results, multiple, voterNames }: Props) {
  return (
    <figure>
      <ul className="space-y-4">
        {results.rows.map((row) => {
          const names = voterNames?.[row.id] ?? [];
          return (
            <li key={row.id}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className={row.isLeader ? "font-bold" : "font-medium"}>
                  {row.isLeader && <span aria-hidden>👑 </span>}
                  {row.label}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-gray-600 dark:text-gray-300">
                  <span className="font-semibold text-gray-900 dark:text-gray-50">{row.share}%</span> · {row.votes}표
                </span>
              </div>
              <div
                role="img"
                aria-label={`${row.label}: ${row.votes}표, ${row.share}%${row.isLeader ? ", 최다 득표" : ""}`}
                className="h-7 w-full overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800"
              >
                <div
                  className={`h-full rounded-md transition-[width] duration-700 ${
                    row.isLeader ? "bg-blue-600" : "bg-blue-300 dark:bg-blue-800"
                  }`}
                  style={{ width: `${row.share}%` }}
                />
              </div>
              {voterNames && (
                <p className="mt-1 text-xs text-gray-500">{names.length > 0 ? names.join(", ") : "—"}</p>
              )}
            </li>
          );
        })}
      </ul>
      <figcaption className="mt-5 space-y-1 text-sm text-gray-500">
        <p>
          투표자 {results.total}명{results.total === 0 && " · 아직 투표한 사람이 없습니다."}
        </p>
        {multiple && <p>복수 선택 투표라 득표율은 투표자 수 기준이며, 합이 100%를 넘을 수 있어요.</p>}
      </figcaption>
    </figure>
  );
}
