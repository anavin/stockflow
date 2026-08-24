import type { PlatformDailyRow } from "@/lib/queries";
import { enabledPlatforms, platformName } from "@/lib/config";
import { PlatformDot } from "./PlatformBadge";
import { CalendarDays } from "lucide-react";

const TH_M = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const dayLabel = (ymd: string) => { const [, m, d] = ymd.split("-"); return `${+d} ${TH_M[+m - 1] || m}`; };

/** ตารางเทียบแพลตฟอร์ม "รายวัน" (N วันล่าสุด) บนแดชบอร์ดภาพรวม — แถว = วัน, คอลัมน์ = แพลตฟอร์ม */
export default function PlatformDailyCompare({ rows }: { rows: PlatformDailyRow[] }) {
  if (rows.length === 0) return null;
  // แพลตฟอร์มที่มีข้อมูลในช่วงนี้ (คงลำดับตาม enabledPlatforms)
  const platforms = enabledPlatforms().map((p) => p.code).filter((c) => rows.some((r) => r.platform === c));
  const days = [...new Set(rows.map((r) => r.ymd))].sort().reverse();
  const cell = (ymd: string, code: string) => rows.find((r) => r.ymd === ymd && r.platform === code)?.orders || 0;
  const dayTotal = (ymd: string) => rows.filter((r) => r.ymd === ymd).reduce((a, r) => a + r.orders, 0);
  const maxDay = Math.max(1, ...days.map(dayTotal));
  const colTotal = (code: string) => rows.filter((r) => r.platform === code).reduce((a, r) => a + r.orders, 0);
  const grand = rows.reduce((a, r) => a + r.orders, 0);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-semibold text-ink">
        <CalendarDays size={16} className="text-brand" /> เทียบแพลตฟอร์ม · รายวัน
        <span className="text-xs font-normal text-muted">ออร์เดอร์ต่อวัน ({days.length} วันล่าสุด)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="px-5 py-2.5">วันที่</th>
              {platforms.map((c) => (
                <th key={c} className="px-3 py-2.5 text-right">
                  <span className="inline-flex items-center gap-1"><PlatformDot platform={c} /> {platformName(c)}</span>
                </th>
              ))}
              <th className="px-3 py-2.5 text-right">รวม</th>
              <th className="px-3 py-2.5" style={{ width: 130 }}>สัดส่วน</th>
            </tr>
          </thead>
          <tbody>
            {days.map((ymd) => {
              const tot = dayTotal(ymd);
              return (
                <tr key={ymd} className="border-t border-line hover:bg-soft/40">
                  <td className="px-5 py-2 font-medium text-ink whitespace-nowrap">{dayLabel(ymd)}</td>
                  {platforms.map((c) => {
                    const n = cell(ymd, c);
                    return <td key={c} className={`px-3 py-2 text-right tabular-nums ${n ? "text-muted" : "text-faint"}`}>{n || "—"}</td>;
                  })}
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">{tot.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-soft">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(tot / maxDay * 100)}%` }} />
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
              <td className="px-3 py-2.5"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
