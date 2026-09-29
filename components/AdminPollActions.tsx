"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// 관리자에게만 렌더링된다. 실제 권한 검사는 API가 한다(ADR-0004).
export default function AdminPollActions({ pollId, question }: { pollId: string; question: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`"${question}" 투표를 삭제할까요?\n선택지와 득표도 함께 삭제되며 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/polls/${pollId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "삭제하지 못했습니다.");
    setDeleting(false);
  }

  return (
    <div className="mb-6 flex items-center gap-2 rounded-lg border border-blue-600/30 bg-blue-50 px-3 py-2 text-sm dark:bg-blue-950/40">
      <span className="mr-auto font-medium text-blue-700 dark:text-blue-300">관리자 메뉴</span>
      <Link
        href={`/polls/${pollId}/edit`}
        className="rounded-md border border-black/20 px-3 py-1 hover:bg-white dark:border-white/25 dark:hover:bg-white/10"
      >
        수정
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-md bg-red-600 px-3 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {deleting ? "삭제 중..." : "삭제"}
      </button>
      {error && <p className="w-full text-red-600">{error}</p>}
    </div>
  );
}
