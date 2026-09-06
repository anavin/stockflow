import type { SizeMixRow } from "@/lib/queries";
import { PieChart } from "lucide-react";

const PALETTE = ["#0d9488", "#0ea5e9", "#6366f1", "#f59e0b", "#ef4444", "#ec4899", "#84cc16", "#64748b", "#14b8a6", "#a855f7"];

/** โดนัทสัดส่วนขนาดขวด (ตามจำนวนชิ้นที่เบิก) — ช่วยวางแผนสต๊อก/บรรจุ */
export default function SizeMixDonut({ rows }: { rows: SizeMixRow[] }) {
  if (rows.length === 0) return null;
  const top = rows.slice(0, 9);
  const rest = rows.slice(9);
  const data = rest.length
    ? [...top, { size: "อื่นๆ", qty: rest.reduce((a, r) => a + r.qty, 0), orders: 0 }]
    : top;
  const total = data.reduce((a, r) => a + r.qty, 0) || 1;
  const R = 60, C = 2 * Math.PI * R;
  let acc = 0;
  const segs = data.map((r, i) => {
    const frac = r.qty / total;
    const seg = { color: PALETTE[i % PALETTE.length], len: frac * C, off: acc * C, pct: Math.round(frac * 100), ...r };
    acc += frac;
    return seg;
  });

  return (
    <section className="card p-5">
      <header className="mb-3 flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><PieChart size={16} className="text-brand" /> สัดส่วนขนาดขวด</h2>
        <span className="text-xs text-muted">ตามจำนวนที่เบิก</span>
      </header>
      <div className="flex flex-wrap items-center gap-5">
        <svg width="150" height="150" viewBox="0 0 150 150" className="shrink-0 -rotate-90" role="img" aria-label="สัดส่วนขนาดขวด">
          <circle cx="75" cy="75" r={R} fill="none" className="stroke-soft" strokeWidth="20" />
          {segs.map((s, i) => (
            <circle key={i} cx="75" cy="75" r={R} fill="none" stroke={s.color} strokeWidth="20"
              strokeDasharray={`${s.len} ${C - s.len}`} strokeDashoffset={-s.off} />
          ))}
          <text x="75" y="72" transform="rotate(90 75 75)" textAnchor="middle" className="fill-ink" style={{ fontSize: 18, fontWeight: 700 }}>{total.toLocaleString()}</text>
          <text x="75" y="88" transform="rotate(90 75 75)" textAnchor="middle" className="fill-faint" style={{ fontSize: 9 }}>ชิ้น</text>
        </svg>
        <div className="min-w-0 flex-1 space-y-1.5">
          {segs.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="w-20 shrink-0 truncate text-ink" title={s.size}>{s.size}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft">
                <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
              </div>
              <span className="w-16 shrink-0 text-right tabular-nums text-muted">{s.qty.toLocaleString()}</span>
              <span className="w-8 shrink-0 text-right tabular-nums text-faint">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
