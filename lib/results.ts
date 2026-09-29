import type { Option } from "./polls";

export type ResultRow = Option & { share: number; isLeader: boolean };
export type Results = { total: number; rows: ResultRow[] };

// 득표율(Share)은 정수 % 반올림, 총 0표면 모두 0%. 최다 득표는 동률이면 모두 선두.
export function computeResults(options: Option[]): Results {
  const total = options.reduce((sum, o) => sum + o.votes, 0);
  const top = Math.max(0, ...options.map((o) => o.votes));
  return {
    total,
    rows: options.map((o) => ({
      ...o,
      share: total === 0 ? 0 : Math.round((o.votes / total) * 100),
      isLeader: top > 0 && o.votes === top,
    })),
  };
}
