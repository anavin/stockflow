import type { NewReturnMonth } from "@/lib/queries";
import { Users } from "lucide-react";

const TH_M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const mLabel = (ym: string) => { const mm = +ym.slice(5, 7); return `${TH_M[mm - 1] || ym}${ym.slice(2, 4)}`; };

/** ลูกค้าใหม่ vs กลับมาซื้อ รายเดือน (แท่งซ้อน) — ดูว่าฐานลูกค้าโตจากใคร */
export default function NewVsReturningBars({ rows }: { rows: NewReturnMonth[] }) {
  if (rows.length === 0) return null;
  const max = Math.max(1, ...rows.map((r) => r.new_c + r.repeat_c + r.unknown_c));
  const legend = [
    { label: "ลูกค้าใหม่", color: "rgb(var(--brand))" },
    { label: "กลับมาซื้อ", color: "#16a34a" },
    { label: "ไม่ระบุ", color: "#cbd5e1" },
  ];
  const totNew = rows.reduce((a, r) => a + r.new_c, 0);
  const totRep = rows.reduce((a, r) => a + r.repeat_c, 0);

  return (
    <section className="card p-5">
      <header className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Users size={16} className="text-brand" /> ลูกค้าใหม่ vs กลับมาซื้อ</h2>
        <span className="text-xs text-muted">รายเดือน</span>
      </header>
      <div className="mb-3 flex flex-wrap gap-4">
        {legend.map((l) => <span key={l.label} className="inline-flex items-center gap-1.5 text-xs text-muted"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} /> {l.label}</span>)}
      </div>
      <div className="flex items-end justify-between gap-1.5">
        {rows.map((r) => {
          const tot = r.new_c + r.repeat_c + r.unknown_c;
          const BAR = 150; // ความสูงพื้นที่แท่ง (px) — ใช้ px ตรงๆ กัน % ยุบเป็น 0
          const px = (v: number) => `${(v / max) * BAR}px`;
          return (
            <div key={r.ym} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-muted">{tot || ""}</span>
              <div className="flex w-full max-w-[30px] flex-col justify-end overflow-hidden rounded-t-md" style={{ height: BAR }}
                title={`${mLabel(r.ym)} · ใหม่ ${r.new_c} · กลับมา ${r.repeat_c}${r.unknown_c ? ` · ไม่ระบุ ${r.unknown_c}` : ""}`}>
                {r.unknown_c > 0 && <div style={{ height: px(r.unknown_c), backgroundColor: "#cbd5e1" }} />}
                {r.repeat_c > 0 && <div style={{ height: px(r.repeat_c), backgroundColor: "#16a34a" }} />}
                {r.new_c > 0 && <div style={{ height: px(r.new_c), backgroundColor: "rgb(var(--brand))" }} />}
              </div>
              <span className="text-[10px] text-faint">{mLabel(r.ym)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 border-t border-line pt-2 text-xs text-muted">
        <span>ใหม่รวม <b className="text-ink">{totNew.toLocaleString()}</b></span>
        <span>กลับมารวม <b className="text-ink">{totRep.toLocaleString()}</b></span>
        <span className="ml-auto">ซื้อซ้ำ <b className="text-brand-600">{totNew + totRep > 0 ? Math.round((totRep / (totNew + totRep)) * 100) : 0}%</b></span>
      </div>
    </section>
  );
}
