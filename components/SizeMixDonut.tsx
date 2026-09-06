import type { SizeMixRow } from "@/lib/queries";
import { PieChart } from "lucide-react";

// โชว์เฉพาะ 6 ขนาดหลัก (รวม variant เช่น "4 ml." / "1.2 ml (xx หลอด)" ตามเลข ml) — ตัดขนาดอื่นออก
const ALLOWED = ["1.2", "4", "10", "30", "50", "90"];
const COLORS: Record<string, string> = {
  "1.2": "#0d9488", "4": "#0ea5e9", "10": "#6366f1", "30": "#f59e0b", "50": "#ec4899", "90": "#84cc16",
};
const mlToken = (s: string) => (s || "").toLowerCase().match(/[0-9]+(\.[0-9]+)?/)?.[0] ?? "";

/** โดนัทสัดส่วนขนาดขวด (เฉพาะ 6 ขนาดหลัก ตามจำนวนที่เบิก) */
export default function SizeMixDonut({ rows }: { rows: SizeMixRow[] }) {
  // รวมยอดตามเลข ml → คงเฉพาะที่อยู่ใน ALLOWED
  const byTok = new Map<string, number>();
  for (const r of rows) {
    const t = mlToken(r.size);
    if (ALLOWED.includes(t)) byTok.set(t, (byTok.get(t) || 0) + r.qty);
  }
  const data = ALLOWED.filter((t) => byTok.has(t))
    .map((t) => ({ tok: t, size: `${t} ml`, qty: byTok.get(t)!, color: COLORS[t] }))
    .sort((a, b) => b.qty - a.qty);
  if (data.length === 0) return null;

  const total = data.reduce((a, r) => a + r.qty, 0) || 1;
  const R = 85, SW = 30, C = 2 * Math.PI * R, GAP = data.length > 1 ? 6 : 0;
  let acc = 0;
  const segs = data.map((r) => {
    const frac = r.qty / total;
    const len = Math.max(0, frac * C - GAP);
    const seg = { ...r, len, off: acc * C, pct: Math.round(frac * 100) };
    acc += frac;
    return seg;
  });
  const top = data[0];

  return (
    <section className="card p-5">
      <header className="mb-4 flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><PieChart size={16} className="text-brand" /> สัดส่วนขนาดขวด</h2>
        <span className="text-xs text-muted">ตามจำนวนที่เบิก · 6 ขนาดหลัก</span>
      </header>
      <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-start sm:gap-8">
        <svg width="210" height="210" viewBox="0 0 210 210" className="shrink-0 -rotate-90" role="img" aria-label="สัดส่วนขนาดขวด">
          <circle cx="105" cy="105" r={R} fill="none" className="stroke-soft" strokeWidth={SW} />
          {segs.map((s) => (
            <circle key={s.tok} cx="105" cy="105" r={R} fill="none" stroke={s.color} strokeWidth={SW}
              strokeLinecap="round" strokeDasharray={`${s.len} ${C - s.len}`} strokeDashoffset={-s.off} />
          ))}
          <text x="105" y="99" transform="rotate(90 105 105)" textAnchor="middle" className="fill-ink" style={{ fontSize: 26, fontWeight: 800 }}>{total.toLocaleString()}</text>
          <text x="105" y="120" transform="rotate(90 105 105)" textAnchor="middle" className="fill-faint" style={{ fontSize: 11 }}>ชิ้น · ขายดี {top.size}</text>
        </svg>
        <div className="min-w-[200px] flex-1 space-y-2.5">
          {segs.map((s) => (
            <div key={s.tok} className="flex items-center gap-2.5">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="w-16 shrink-0 text-sm font-medium text-ink">{s.size}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-soft">
                <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
              </div>
              <span className="w-16 shrink-0 text-right text-sm tabular-nums text-ink">{s.qty.toLocaleString()}</span>
              <span className="w-9 shrink-0 text-right text-xs tabular-nums text-faint">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
