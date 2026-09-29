import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { isAdmin } from "@/lib/auth";

// 외부 주소로 튕기지 않도록 앱 내부 경로만 허용한다.
const safeNext = (next: string | string[] | undefined) =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const next = safeNext((await searchParams).next);
  if (await isAdmin()) redirect(next);

  return (
    <section className="mx-auto max-w-sm">
      <h1 className="mb-2 text-2xl font-bold">관리자 로그인</h1>
      <p className="mb-6 text-sm text-gray-500">투표를 만들고, 수정하고, 삭제하려면 로그인하세요.</p>
      <LoginForm next={next} />
    </section>
  );
}
