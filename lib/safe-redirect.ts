// 로그인 후 ?next= 로 돌아갈 경로. 외부 사이트로 튕기는 오픈 리다이렉트를 막는다.
// 브라우저는 "\"를 "/"로 바꾸고 탭·개행을 지우므로 이런 문자가 있으면 모두 거부한다.
export function safeRedirectPath(next: string | string[] | undefined): string {
  if (typeof next !== "string" || !next.startsWith("/") || /[\\\s]/.test(next)) return "/";
  const base = "http://app.invalid";
  const url = new URL(next, base);
  return url.origin === base ? url.pathname + url.search : "/";
}
