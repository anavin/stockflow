import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-user";
import { listActivityLog } from "@/lib/queries";
import ActivityLog from "@/components/ActivityLog";
import { ChevronLeft, ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ user?: string; action?: string; date?: string }> }) {
  await requireAdmin();   // เห็นเฉพาะ admin
  const { user, action, date } = await searchParams;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date || "") ? date! : "";
  const rows = await listActivityLog({ user: user || undefined, action: action || undefined, date: d || undefined });
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink"><ScrollText size={18} /> บันทึกการใช้งาน</h1>
        <p className="mt-0.5 text-sm text-muted">ใครเข้าใช้ / ทำอะไร เมื่อไหร่ — เห็นเฉพาะแอดมิน · กรองตามผู้ใช้/การกระทำ/วันได้</p>
      </div>
      <ActivityLog rows={rows} user={user || ""} action={action || ""} date={d} />
    </div>
  );
}
