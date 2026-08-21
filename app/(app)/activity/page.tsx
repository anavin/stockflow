import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-user";
import { listActivityLog, countActivityLog } from "@/lib/queries";
import ActivityLog from "@/components/ActivityLog";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 100;
const d = (v?: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v! : "");

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ user?: string; action?: string; from?: string; to?: string; page?: string }> }) {
  await requireAdmin();   // เห็นเฉพาะ admin
  const { user, action, from, to, page } = await searchParams;
  const f = { user: user || undefined, action: action || undefined, from: d(from) || undefined, to: d(to) || undefined };
  const pageNum = Math.max(1, Number(page) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;
  const [rows, total] = await Promise.all([listActivityLog({ ...f, limit: PAGE_SIZE, offset }), countActivityLog(f)]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const sp = new URLSearchParams();
    if (user) sp.set("user", user); if (action) sp.set("action", action);
    if (f.from) sp.set("from", f.from); if (f.to) sp.set("to", f.to);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString(); return `/activity${s ? "?" + s : ""}`;
  };
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink"><ScrollText size={18} /> บันทึกการใช้งาน</h1>
        <p className="mt-0.5 text-sm text-muted">ใครเข้าใช้ / ทำอะไร เมื่อไหร่ — เห็นเฉพาะแอดมิน · กรองตามผู้ใช้/การกระทำ/ช่วงวันได้ · ทั้งหมด {total.toLocaleString()} รายการ</p>
      </div>
      <ActivityLog rows={rows} user={user || ""} action={action || ""} from={f.from || ""} to={f.to || ""} total={total} />
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">หน้า {pageNum} / {totalPages.toLocaleString()}</span>
          <div className="flex gap-2">
            {pageNum > 1 ? <Link href={qs(pageNum - 1)} className="btn-ghost"><ChevronLeft size={16} /> ก่อนหน้า</Link>
              : <span className="btn-ghost pointer-events-none opacity-40"><ChevronLeft size={16} /> ก่อนหน้า</span>}
            {pageNum < totalPages ? <Link href={qs(pageNum + 1)} className="btn-ghost">ถัดไป <ChevronRight size={16} /></Link>
              : <span className="btn-ghost pointer-events-none opacity-40">ถัดไป <ChevronRight size={16} /></span>}
          </div>
        </div>
      )}
    </div>
  );
}
