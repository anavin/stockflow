import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-user";
import { lapsedCustomers, customerRepeat } from "@/lib/queries";
import ReportTabs from "@/components/ReportTabs";
import { ReportHeader, Kpi, SectionCard } from "@/components/ReportUI";
import { Users, UserX } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersReport() {
  await requireAdmin();
  const [lapsed, repeat] = await Promise.all([lapsedCustomers(90, 60), customerRepeat()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <ReportHeader icon={<Users size={22} />} title="ลูกค้า" subtitle="ฐานลูกค้า · การซื้อซ้ำ · ลูกค้าที่ควรดึงกลับ" />
      <ReportTabs />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi label="ลูกค้าทั้งหมด" value={repeat.customers.toLocaleString()} icon={<Users size={17} />} tone="slate" />
        <Kpi label="ซื้อซ้ำ" value={`${repeat.repeat_pct}%`} sub={`${repeat.repeat_customers.toLocaleString()} คน`} icon={<Users size={17} />} tone="brand" />
        <Kpi label="หายไป (win-back)" value={lapsed.length.toLocaleString()} sub="เคยซื้อ ≥2 · หาย >90 วัน" icon={<UserX size={17} />} tone="amber" />
      </div>

      <SectionCard title="ลูกค้าที่หายไป — ควรดึงกลับ (เคยซื้อ ≥2 ครั้ง · หาย >90 วัน)" icon={<UserX size={16} />} tone="amber">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr><th className="px-5 py-2.5">#</th><th className="px-3 py-2.5">ชื่อผู้ใช้ / ผู้รับ</th><th className="px-3 py-2.5 text-right">เคยซื้อ</th><th className="px-3 py-2.5">ซื้อล่าสุด</th><th className="px-3 py-2.5 text-right">หายไป</th></tr>
            </thead>
            <tbody>
              {lapsed.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">ไม่มีลูกค้าที่หายไป 🎉</td></tr>}
              {lapsed.map((c, i) => (
                <tr key={c.username} className="border-t border-line hover:bg-soft/40">
                  <td className="px-5 py-2 text-xs font-semibold text-faint">{i + 1}</td>
                  <td className="px-3 py-2"><Link href={`/reports/customer?u=${encodeURIComponent(c.username)}`} className="font-medium text-brand-600 hover:underline">{c.username}</Link>{c.receiver ? <span className="block text-xs text-muted">{c.receiver}</span> : null}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">{c.orders}</td>
                  <td className="px-3 py-2 text-xs text-muted">{c.last_at || "—"}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${c.days_since >= 180 ? "text-red-600" : "text-amber-600"}`}>{c.days_since} วัน</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <p className="mt-3 text-xs text-faint">* คลิกชื่อ → ดูประวัติซื้อทั้งหมด · ใช้ทำแคมเปญดึงลูกค้ากลับ (ส่งโปรฯ/ทัก)</p>
    </div>
  );
}
