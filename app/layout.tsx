import type { Metadata } from "next";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/auth";
import "./globals.css";

const AUTHOR = "이동건";

export const metadata: Metadata = {
  title: `투표 앱 · ${AUTHOR}`,
  description: `질문을 올리고 함께 투표하는 동아리 투표 앱 (제작: ${AUTHOR})`,
  authors: [{ name: AUTHOR }],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const admin = await isAdmin();

  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/15">
          <nav className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-bold">🗳️ 투표 앱</span>
              <span className="text-sm text-gray-500">by {AUTHOR}</span>
            </Link>
            {admin ? (
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs font-medium text-blue-600">관리자</span>
                <LogoutButton />
                <Link
                  href="/new"
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  새 투표 만들기
                </Link>
              </div>
            ) : (
              <Link href="/admin/login" className="shrink-0 text-sm text-gray-500 hover:underline">
                관리자 로그인
              </Link>
            )}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-black/10 py-4 text-center text-sm text-gray-500 dark:border-white/15">
          제작: <strong className="text-gray-700 dark:text-gray-300">{AUTHOR}</strong>
        </footer>
      </body>
    </html>
  );
}
