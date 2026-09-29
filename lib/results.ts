import type { Option, PollSummary } from "./polls";

export type ResultRow = Option & { share: number; isLeader: boolean };
export type Results = { total: number; rows: ResultRow[] };

// 득표율(Share)은 투표자 수 대비 정수 % 반올림. 복수 선택이면 합이 100%를 넘을 수 있다.
// 투표자 수를 모르면(단일 선택) 득표 합이 곧 투표자 수다. 최다 득표는 동률이면 모두 선두.
export function computeResults(options: Option[], voters?: number): Results {
  const total = voters ?? options.reduce((sum, o) => sum + o.votes, 0);
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

/** 결과 공개 시점: 마감 후 공개 투표는 마감 전까지 관리자만 결과를 본다. */
export function canSeeResults(poll: Pick<PollSummary, "resultsAfterClose" | "status">, isAdmin: boolean): boolean {
  return isAdmin || !poll.resultsAfterClose || poll.status === "closed";
}
