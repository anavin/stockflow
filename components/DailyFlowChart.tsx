import type { FlowRow } from "@/lib/queries";
import { Activity } from "lucide-react";

const dLabel = (ymd: string) => { const [, m, d] = ymd.split("-"); return `${+d}/${+m}`; };

/** แนวโน้มรายวัน: ออร์เดอร์เข้า vs ตัดสต๊อก vs ส่ง (เส้น) — ดูว่างานเข้ากับงานเคลียร์ทันกันไหม */
export default function DailyFlowChart({ rows, days }: { rows: FlowRow[]; days: number }) {
  if (rows.length === 0) return null;
  const W = 760, H = 220, padL = 30, padR = 14, padT = 14, padB = 26;
  const n = rows.length;
  const max = Math.max(1, ...rows.flatMap((r) => [r.orders, r.issued, r.shipped]));
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, n - 1);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const path = (key: keyof FlowRow) => rows.map((r, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(Number(r[key])).toFixed(1)}`).join(" ");
  const series = [
    { key: "orders" as const, label: "ออร์เดอร์เข้า", color: "rgb(var(--brand))" },
    { key: "issued" as const, label: "ตัดสต๊อก", color: "#16a34a" },
    { key: "shipped" as const, label: "ส่งแล้ว", color: "#0ea5e9" },
  ];
  const yTicks = [0, Math.round(max / 2), max];
  const step = Math.max(1, Math.ceil(n / 7));
  const totals = series.map((s) => ({ ...s, total: rows.reduce((a, r) => a + Number(r[s.key]), 0) }));

  return (
    <section className="card p-5">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Activity size={16} className="text-brand" /> แนวโน้มงาน · ออร์เดอร์ vs ตัด vs ส่ง</h2>
        <span className="text-xs text-muted">{days} วันล่าสุด</span>
      </header>
      {/* legend + ยอดรวมช่วงนี้ */}
      <div className="mb-2 flex flex-wrap gap-4">
        {totals.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} /> {s.label}
            <b className="text-ink">{s.total.toLocaleString()}</b>
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-52 w-full min-w-[520px]" role="img" aria-label="แนวโน้มออร์เดอร์ ตัด ส่ง รายวัน">
          {/* gridlines + y labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} className="stroke-line" strokeWidth="1" strokeDasharray={i === 0 ? "" : "3 3"} opacity="0.7" />
              <text x={padL - 5} y={y(t) + 3} textAnchor="end" className="fill-faint" style={{ fontSize: 9 }}>{t}</text>
            </g>
          ))}
          {/* x labels */}
          {rows.map((r, i) => (i % step === 0 || i === n - 1) ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-faint" style={{ fontSize: 9 }}>{dLabel(r.day)}</text>
          ) : null)}
          {/* lines */}
          {series.map((s) => (
            <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {/* endpoint dots */}
          {series.map((s) => {
            const last = rows[n - 1];
            return <circle key={s.key} cx={x(n - 1)} cy={y(Number(last[s.key]))} r="3" fill={s.color} />;
          })}
        </svg>
      </div>
    </section>
  );
}
