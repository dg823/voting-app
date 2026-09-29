export function formatDateTime(date: Date): string {
  return date.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 남은 시간을 "1일 2시간", "3시간 5분", "7분"처럼 나타낸다. */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "0분";
  const minutes = Math.ceil(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${mins}분`;
  return `${mins}분`;
}

export function formatClosingLabel(closesAt: Date | null): string {
  return closesAt ? `마감 ${formatDateTime(closesAt)}` : "마감 없음";
}

type Schedule = { opensAt: Date | null; closesAt: Date | null; status: "scheduled" | "open" | "closed" };

/** "시작 … · 마감 …" 한 줄. 시작 시각은 아직 시작 전일 때만 보여준다. */
export function formatScheduleLabel({ opensAt, closesAt, status }: Schedule): string {
  const opening = status === "scheduled" && opensAt ? `시작 ${formatDateTime(opensAt)}` : null;
  return [opening, formatClosingLabel(closesAt)].filter(Boolean).join(" · ");
}

/** 다음에 상태가 바뀌는 시각: 예정이면 시작 시각, 진행 중이면 마감 시각. */
export function nextStatusChangeAt({ opensAt, closesAt, status }: Schedule): Date | null {
  if (status === "scheduled") return opensAt;
  if (status === "open") return closesAt;
  return null;
}
