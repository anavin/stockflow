import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-user";
import { lapsedCustomers, customerRepeat } from "@/lib/queries";
import ReportTabs from "@/components/ReportTabs";
import { BarChart3, UserX, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersReport() {
  await requireAdmin();
  const [lapsed, repeat] = await Promise.all([lapsedCustomers(90, 60), customerRepeat()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-4"><h1 className="flex items-center gap-2 text-xl font-bold text-ink"><BarChart3 size={18} /> รายงาน & วิเคราะห์</h1></div>
      <ReportTabs />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="card p-4"><div className="flex items-center gap-1.5 text-xs text-muted"><Users size={16} /> ลูกค้าทั้งหมด</div><div className="mt-1 text-2xl font-bold text-ink">{repeat.customers.toLocaleString()}</div></div>
        <div className="card p-4"><div className="flex items-center gap-1.5 text-xs text-muted"><Users size={16} /> ซื้อซ้ำ</div><div className="mt-1 text-2xl font-bold text-ink">{repeat.repeat_pct}%</div><div className="text-xs text-faint">{repeat.repeat_customers.toLocaleString()} คน</div></div>
        <div className="card p-4"><div className="flex items-center gap-1.5 text-xs text-muted"><UserX size={16} /> หายไป (win-back)</div><div className="mt-1 text-2xl font-bold text-amber-600">{lapsed.length.toLocaleString()}</div><div className="text-xs text-faint">เคยซื้อ ≥2 · หาย &gt;90 วัน</div></div>
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-semibold text-ink"><UserX size={16} className="text-brand" /> ลูกค้าที่หายไป — ควรดึงกลับ (เคยซื้อ ≥2 ครั้ง · หาย &gt;90 วัน)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr><th className="px-5 py-2.5">#</th><th className="px-3 py-2.5">ชื่อผู้ใช้ / ผู้รับ</th><th className="px-3 py-2.5 text-right">เคยซื้อ</th><th className="px-3 py-2.5">ซื้อล่าสุด</th><th className="px-3 py-2.5 text-right">หายไป</th></tr>
            </thead>
            <tbody>
              {lapsed.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">ไม่มีลูกค้าที่หายไป 🎉</td></tr>}
              {lapsed.map((c, i) => (
                <tr key={c.username} className="border-t border-line hover:bg-soft/40">
                  <td className="px-5 py-2 text-xs text-faint">{i + 1}</td>
                  <td className="px-3 py-2"><Link href={`/reports/customer?u=${encodeURIComponent(c.username)}`} className="font-medium text-brand-600 hover:underline">{c.username}</Link>{c.receiver ? <span className="block text-xs text-muted">{c.receiver}</span> : null}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">{c.orders}</td>
                  <td className="px-3 py-2 text-xs text-muted">{c.last_at || "—"}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${c.days_since >= 180 ? "text-red-600" : "text-amber-600"}`}>{c.days_since} วัน</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-3 text-xs text-faint">* คลิกชื่อ → ดูประวัติซื้อทั้งหมด · ใช้ทำแคมเปญดึงลูกค้ากลับ (ส่งโปรฯ/ทัก)</p>
    </div>
  );
}
