import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-user";
import { topRepeatCustomers, customerRepeat } from "@/lib/queries";
import { ReportHeader, Bar, SectionCard } from "@/components/ReportUI";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RepeatCustomersPage() {
  await requireAdmin();
  const [list, repeat] = await Promise.all([topRepeatCustomers(5000), customerRepeat()]);
  const maxCust = Math.max(1, ...list.map((c) => c.orders));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <ReportHeader
        icon={<Users size={22} />}
        title="ลูกค้าซื้อซ้ำทั้งหมด"
        subtitle={<>ซื้อ ≥ 2 ครั้ง · ทั้งหมด <b className="text-ink">{list.length.toLocaleString()}</b> คน (จากลูกค้า {repeat.customers.toLocaleString()} คน · ซื้อซ้ำ {repeat.repeat_pct}%)</>}
        back={{ href: "/reports", label: "กลับรายงาน" }}
      />

      <SectionCard title={`รายชื่อ ${list.length.toLocaleString()} คน`} icon={<Users size={16} />}>
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
                  <td className="px-5 py-2 text-xs font-semibold text-faint">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link href={`/reports/customer?u=${encodeURIComponent(c.username)}`} className="font-medium text-brand-600 hover:underline">{c.username}</Link>
                    {c.receiver ? <span className="block text-xs text-muted">{c.receiver}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{c.platforms}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">{c.orders}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{c.qty.toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs text-muted">{c.last_at || "—"}</td>
                  <td className="px-3 py-2"><Bar pct={c.orders / maxCust * 100} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <p className="mt-3 text-xs text-faint">* คลิกชื่อ → ดูประวัติซื้อทั้งหมดของลูกค้ารายนั้น</p>
    </div>
  );
}
