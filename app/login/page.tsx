import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/roles";
import { APP_TITLE } from "@/lib/config";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-soft p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            เบิก
          </div>
          <h1 className="text-lg font-bold text-ink">{APP_TITLE}</h1>
          <p className="mt-1 text-xs text-muted">เข้าสู่ระบบเพื่อจัดการใบเบิกสินค้า</p>
        </div>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
