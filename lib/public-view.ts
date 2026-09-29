import type { Poll, PollSummary } from "./polls";
import { canSeeResults } from "./results";

// 결과 공개 시점(마감 후 공개)을 API 응답에서도 지키기 위해, 숨겨야 할 때는 득표 정보를 뺀다.

function withoutBallotCount<T extends PollSummary>(poll: T): Omit<T, "ballotCount"> {
  const copy: Partial<T> = { ...poll };
  delete copy.ballotCount;
  return copy as Omit<T, "ballotCount">;
}

export function publicSummary(poll: PollSummary, isAdmin: boolean) {
  return canSeeResults(poll, isAdmin) ? poll : withoutBallotCount(poll);
}

export function publicPoll(poll: Poll, isAdmin: boolean) {
  if (canSeeResults(poll, isAdmin)) return { ...poll, resultsHidden: false };
  return {
    ...withoutBallotCount(poll),
    options: poll.options.map(({ id, label }) => ({ id, label })),
    resultsHidden: true,
  };
}
