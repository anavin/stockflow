import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-user";
import { topRepeatCustomers, customerRepeat } from "@/lib/queries";
import { ChevronLeft, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RepeatCustomersPage() {
  await requireAdmin();
  const [list, repeat] = await Promise.all([topRepeatCustomers(5000), customerRepeat()]);
  const maxCust = Math.max(1, ...list.map((c) => c.orders));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href="/reports" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ChevronLeft size={16} /> กลับรายงาน</Link>
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink"><Users size={18} /> ลูกค้าซื้อซ้ำทั้งหมด</h1>
        <p className="mt-0.5 text-sm text-muted">ซื้อ ≥ 2 ครั้ง · ทั้งหมด <b className="text-ink">{list.length.toLocaleString()}</b> คน (จากลูกค้า {repeat.customers.toLocaleString()} คน · ซื้อซ้ำ {repeat.repeat_pct}%)</p>
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-2.5">#</th>
                <th className="px-3 py-2.5">ชื่อผู้ใช้ / ผู้รับ</th>
                <th className="px-3 py-2.5">แพลตฟอร์ม</th>
                <th className="px-3 py-2.5 text-right">จำนวนครั้ง</th>
                <th className="px-3 py-2.5 text-right">ชิ้นรวม</th>
                <th className="px-3 py-2.5">ซื้อล่าสุด</th>
                <th className="px-3 py-2.5" style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted">ยังไม่มีลูกค้าซื้อซ้ำ</td></tr>}
              {list.map((c, i) => (
                <tr key={c.username} className="border-t border-line hover:bg-soft/40">
                  <td className="px-5 py-2 text-xs text-faint">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link href={`/reports/customer?u=${encodeURIComponent(c.username)}`} className="font-medium text-brand-600 hover:underline">{c.username}</Link>
                    {c.receiver ? <span className="block text-xs text-muted">{c.receiver}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{c.platforms}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">{c.orders}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{c.qty.toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs text-muted">{c.last_at || "—"}</td>
                  <td className="px-3 py-2"><div className="h-2 w-full overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(c.orders / maxCust * 100)}%` }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-3 text-xs text-faint">* คลิกชื่อ → ดูประวัติซื้อทั้งหมดของลูกค้ารายนั้น</p>
    </div>
  );
}
