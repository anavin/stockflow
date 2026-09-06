import Link from "next/link";
import type { DailyMatrixRow } from "@/lib/queries";
import { enabledPlatforms, platformName } from "@/lib/config";
import { PlatformDot } from "./PlatformBadge";
import { CalendarCheck } from "lucide-react";

const TH_M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const dayLabel = (ymd: string) => { const [, m, d] = ymd.split("-"); return `${+d} ${TH_M[+m - 1] || m}`; };

/** ตารางรายวันรวม 2 มุมมอง: แยกแพลตฟอร์ม (คอลัมน์) + ตัดสต๊อก/รอตัด/คืบหน้า — คลิก drill ไป /orders ได้ทุกช่อง
 *  ใช้เฉพาะโหมด "ทุกแพลตฟอร์ม" บนแดชบอร์ด (แทน ออร์เดอร์รายวัน + เทียบแพลตฟอร์ม·รายวัน) */
export default function DailyMatrix({ rows }: { rows: DailyMatrixRow[] }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted">ยังไม่มีข้อมูล</p>;
  const platforms = enabledPlatforms().map((p) => p.code).filter((c) => rows.some((r) => r.platform === c));
  const days = [...new Set(rows.map((r) => r.day))].sort().reverse();
  const cell = (day: string, code: string) => rows.find((r) => r.day === day && r.platform === code)?.orders || 0;
  const agg = (day: string) => {
    const rs = rows.filter((r) => r.day === day);
    const orders = rs.reduce((a, r) => a + r.orders, 0);
    const issued = rs.reduce((a, r) => a + r.issued, 0);
    return { orders, issued, pending: orders - issued };
  };
  const colTotal = (code: string) => rows.filter((r) => r.platform === code).reduce((a, r) => a + r.orders, 0);
  const grand = rows.reduce((a, r) => a + r.orders, 0);
  const grandIssued = rows.reduce((a, r) => a + r.issued, 0);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-semibold text-ink">
        <CalendarCheck size={16} className="text-brand" /> ออร์เดอร์รายวัน · แยกแพลตฟอร์ม + ตัดสต๊อก
        <span className="text-xs font-normal text-muted">{days.length} วันล่าสุด (ตามวันที่สั่งซื้อ) · คลิกตัวเลขดูรายการ</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="px-5 py-2.5">วันที่</th>
              {platforms.map((c) => (
                <th key={c} className="px-3 py-2.5 text-right"><span className="inline-flex items-center gap-1"><PlatformDot platform={c} /> {platformName(c)}</span></th>
              ))}
              <th className="px-3 py-2.5 text-right font-semibold">รวม</th>
              <th className="px-3 py-2.5 text-right">ตัดแล้ว</th>
              <th className="px-3 py-2.5 text-right">รอตัด</th>
              <th className="px-3 py-2.5" style={{ width: 120 }}>คืบหน้า</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const { orders, issued, pending } = agg(day);
              const pct = orders > 0 ? Math.round((issued / orders) * 100) : 0;
              return (
                <tr key={day} className={`border-t border-line hover:bg-soft/40 ${pending > 0 ? "bg-amber-50/30" : ""}`}>
                  <td className="whitespace-nowrap px-5 py-2 font-medium text-ink">
                    <Link href={`/orders?from=${day}&to=${day}`} className="hover:text-brand-600 hover:underline">{dayLabel(day)}</Link>
                  </td>
                  {platforms.map((c) => {
                    const n = cell(day, c);
                    return (
                      <td key={c} className={`px-3 py-2 text-right tabular-nums ${n ? "text-muted" : "text-faint"}`}>
                        {n ? <Link href={`/orders?platform=${c}&from=${day}&to=${day}`} className="hover:underline">{n}</Link> : "—"}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">
                    <Link href={`/orders?from=${day}&to=${day}`} className="hover:underline">{orders.toLocaleString()}</Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-green-600">
                    <Link href={`/orders?from=${day}&to=${day}&issued=yes`} className="hover:underline">{issued.toLocaleString()}</Link>
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${pending > 0 ? "font-semibold text-amber-600" : "text-faint"}`}>
                    {pending > 0 ? <Link href={`/orders?from=${day}&to=${day}&issued=no`} className="hover:underline">{pending.toLocaleString()}</Link> : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 min-w-[56px] flex-1 overflow-hidden rounded-full bg-soft">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs text-muted">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line bg-soft/50 font-semibold">
              <td className="px-5 py-2.5 text-ink">รวม</td>
              {platforms.map((c) => <td key={c} className="px-3 py-2.5 text-right tabular-nums text-muted">{colTotal(c).toLocaleString()}</td>)}
              <td className="px-3 py-2.5 text-right tabular-nums text-ink">{grand.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-green-600">{grandIssued.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-amber-600">{(grand - grandIssued).toLocaleString()}</td>
              <td className="px-3 py-2.5"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
