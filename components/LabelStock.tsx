"use client";
import { useMemo, useState } from "react";
import { labelRef } from "@/lib/materials";
import type { LabelScent } from "@/lib/queries";
import MaterialControls, { isLow } from "./MaterialControls";
import { SummaryBar } from "./BulkStock";
import { downloadCsv } from "@/lib/csv";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

export default function LabelStock({ scents, canEdit }: { scents: LabelScent[]; canEdit: boolean }) {
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const grades = useMemo(() => [...new Set(scents.map((s) => s.grade))].sort(), [scents]);
  const scentLow = (s: LabelScent) => s.components.some((c) => isLow(c.qty, c.reorder));
  const lowCount = useMemo(() => scents.filter(scentLow).length, [scents]);
  const t = search.trim().toLowerCase();
  const filtered = useMemo(() => scents.filter((s) =>
    (!t || s.scent.toLowerCase().includes(t)) &&
    (!grade || s.grade === grade) &&
    (!lowOnly || scentLow(s))), [scents, t, grade, lowOnly]);

  const toggle = (k: string) => setCollapsed((c) => { const n = new Set(c); n.has(k) ? n.delete(k) : n.add(k); return n; });
  function exportCsv() {
    const rows: (string | number)[][] = [];
    for (const s of filtered) for (const c of s.components) rows.push([s.scent, s.grade, c.label, c.qty, c.reorder ?? ""]);
    downloadCsv("สติ๊กเกอร์และการ์ด", ["กลิ่น", "Grade", "ชิ้นส่วน", "คงเหลือ", "จุดสั่งซื้อ"], rows);
  }

  return (
    <div className="space-y-4">
      <SummaryBar total={scents.length} unit="กลิ่น" lowCount={lowCount} lowOnly={lowOnly} setLowOnly={setLowOnly} onExport={exportCsv}>
        <div className="relative min-w-[180px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="ค้นหากลิ่น" />
        </div>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="input w-32">
          <option value="">Grade: ทั้งหมด</option>
          {grades.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button onClick={() => setCollapsed(new Set(filtered.map((s) => s.scent)))} className="btn-ghost text-xs"><ChevronRight size={14} /> ย่อ</button>
        <button onClick={() => setCollapsed(new Set())} className="btn-ghost text-xs"><ChevronDown size={14} /> ขยาย</button>
      </SummaryBar>

      <div className="space-y-3">
        {filtered.length === 0 && <p className="card p-10 text-center text-sm text-muted">ไม่พบกลิ่น</p>}
        {filtered.map((s) => {
          const open = !collapsed.has(s.scent);
          const total = s.components.reduce((a, c) => a + c.qty, 0);
          const low = s.components.filter((c) => isLow(c.qty, c.reorder)).length;
          return (
            <div key={s.scent} className="overflow-hidden rounded-xl border border-line bg-white">
              <button onClick={() => toggle(s.scent)} className="flex w-full items-center gap-2 bg-soft/60 px-4 py-2.5 text-left">
                {open ? <ChevronDown size={15} className="text-faint" /> : <ChevronRight size={15} className="text-faint" />}
                <span className="font-semibold text-ink">{s.scent}</span>
                <span className="chip bg-brand-50 text-brand-600">{s.grade}</span>
                <span className="text-xs text-muted">· {s.components.length} ชิ้นส่วน · รวม {total.toLocaleString()}{low > 0 && <span className="text-amber-600"> · ใกล้หมด {low}</span>}</span>
              </button>
              {open && (
                <div className="divide-y divide-line">
                  {s.components.map((c) => (
                    <div key={c.key} className="flex items-center justify-between gap-3 px-4 py-2 pl-10">
                      <span className="text-sm text-ink">{c.label}</span>
                      <MaterialControls canEdit={canEdit} qty={c.qty} unit="ชิ้น" reorder={c.reorder}
                        desc={{ category: "label", refKey: labelRef(s.scent, c.key), scent: s.scent, comp_key: c.key, grade: s.grade, label: `${s.scent} · ${c.label}`, unit: "ชิ้น" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
