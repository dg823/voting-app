// ADR-0001: 투표별 쿠키로 브라우저당 한 번만 투표하게 한다.
export const votedCookieName = (pollId: string) => `voted_${pollId}`;

export const VOTED_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
