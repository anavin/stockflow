import type { IdCoverageRow } from "@/lib/queries";
import { platformName, platformColor } from "@/lib/config";

const USER = "#16a34a";    // เขียว — มี username
const PHONE = "#f59e0b";   // ส้ม — มีแต่เบอร์ (จัดได้ด้วย fallback)
const NONE = "#e5e7eb";    // เทา — ไม่มีเลย (จัดไม่ได้)

/** ตรวจความครบของตัวระบุลูกค้าต่อแพลตฟอร์ม — อธิบายว่าทำไมบางแพลตฟอร์มจัดใหม่/เก่าไม่ได้
 *  จัดได้ = มี username หรือมีเบอร์ · จัดไม่ได้ = ไม่มีทั้งคู่ */
export default function CustomerDataQuality({ rows }: { rows: IdCoverageRow[] }) {
  if (rows.length === 0) return <p className="px-5 py-10 text-center text-muted">ยังไม่มีข้อมูล</p>;
  const pct = (n: number, t: number) => (t ? (n / t) * 100 : 0);

  return (
    <div className="p-5">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: USER }} /> มี username</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PHONE }} /> มีเบอร์/ชื่อผู้รับ (จัดได้)</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: NONE }} /> ไม่มีเลย (จัดไม่ได้)</span>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const ok = r.has_user + r.phone_only;
          const okPct = Math.round(pct(ok, r.total));
          return (
            <div key={r.platform} className="grid grid-cols-[7rem_1fr] items-center gap-3">
              <span className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: platformColor(r.platform) }} /> {platformName(r.platform)}
              </span>
              <div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-soft">
                  <span style={{ width: `${pct(r.has_user, r.total)}%`, backgroundColor: USER }} />
                  <span style={{ width: `${pct(r.phone_only, r.total)}%`, backgroundColor: PHONE }} />
                  <span style={{ width: `${pct(r.neither, r.total)}%`, backgroundColor: NONE }} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] tabular-nums text-muted">
                  <span>รวม {r.total.toLocaleString()}</span>
                  <span style={{ color: USER }}>user {r.has_user.toLocaleString()}</span>
                  <span style={{ color: PHONE }}>เบอร์/ชื่อ {r.phone_only.toLocaleString()}</span>
                  <span className={r.neither > 0 ? "font-medium text-red-600" : "text-faint"}>ไม่มี {r.neither.toLocaleString()}</span>
                  <span className="ml-auto font-semibold text-ink">จัดได้ {okPct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-faint">
        "จัดได้" = ออร์เดอร์ที่มี username / เบอร์ / ชื่อผู้รับ → กดปุ่ม "จัดประเภทย้อนหลัง" แล้วจะได้ลูกค้าใหม่/เก่า
        (จับคู่ตามลำดับ username → เบอร์ → ชื่อผู้รับ) · แถบ<span style={{ color: NONE }}> เทา</span> = ไม่มีตัวระบุเลย → จัดไม่ได้
      </p>
    </div>
  );
}
