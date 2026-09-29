"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 예약 시작·마감 시각이 되면 화면을 다시 불러와 서버(DB)가 판정한 새 상태를 보여준다.
// 브라우저 시계로 상태를 바꾸지 않는다(ADR-0002/0005). 서버가 아직이라고 하면 5초마다 다시 묻는다.
export default function RefreshWhenDue({ at }: { at: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!at) return;
    const due = new Date(at).getTime();
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const wait = due - Date.now();
      if (wait > 0) {
        timer = setTimeout(check, Math.min(wait, 60_000));
        return;
      }
      router.refresh();
      timer = setTimeout(check, 5_000);
    };
    check();
    return () => clearTimeout(timer);
  }, [at, router]);

  return null;
}
