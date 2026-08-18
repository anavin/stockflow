"use client";
import { useMemo, useState } from "react";
import { labelRef } from "@/lib/materials";
import type { LabelScent } from "@/lib/queries";
import MaterialControls, { isLow } from "./MaterialControls";
import { SummaryBar } from "./BulkStock";
import { downloadCsv } from "@/lib/csv";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

// เรียงกลุ่มเกรด: EDP → EDP+ → PARFUM → EDT → อื่นๆ (น้ำปรุง ฯลฯ)
const GRADE_ORDER = ["EDP", "EDP+", "PARFUM", "EDT"];
const gradeRank = (g: string) => { const i = GRADE_ORDER.indexOf(g); return i < 0 ? GRADE_ORDER.length : i; };

export default function LabelStock({ scents, canEdit }: { scents: LabelScent[]; canEdit: boolean }) {
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [collapsedGrade, setCollapsedGrade] = useState<Set<string>>(new Set());   // กรุปเกรด (default กาง)
  const [collapsedScent, setCollapsedScent] = useState<Set<string>>(new Set());   // กลิ่น (default กาง)

  const grades = useMemo(() => [...new Set(scents.map((s) => s.grade))].sort((a, b) => gradeRank(a) - gradeRank(b) || a.localeCompare(b)), [scents]);
  const scentLow = (s: LabelScent) => s.components.some((c) => isLow(c.qty, c.reorder));
  const lowCount = useMemo(() => scents.filter(scentLow).length, [scents]);
  const t = search.trim().toLowerCase();
  const filtered = useMemo(() => scents.filter((s) =>
    (!t || s.scent.toLowerCase().includes(t)) &&
    (!grade || s.grade === grade) &&
    (!lowOnly || scentLow(s))), [scents, t, grade, lowOnly]);

  // จัดกลุ่มตามเกรด (เรียงตามลำดับ)
  const groups = useMemo(() => {
    const m = new Map<string, LabelScent[]>();
    for (const s of filtered) (m.get(s.grade) ?? m.set(s.grade, []).get(s.grade)!).push(s);
    return [...m.entries()]
      .sort((a, b) => gradeRank(a[0]) - gradeRank(b[0]) || a[0].localeCompare(b[0]))
      .map(([g, list]) => ({ grade: g, scents: list.sort((a, b) => a.scent.localeCompare(b.scent, "en")) }));
  }, [filtered]);

  const toggleGrade = (g: string) => setCollapsedGrade((c) => { const n = new Set(c); n.has(g) ? n.delete(g) : n.add(g); return n; });
  const toggleScent = (k: string) => setCollapsedScent((c) => { const n = new Set(c); n.has(k) ? n.delete(k) : n.add(k); return n; });

  function exportCsv() {
    const rows: (string | number)[][] = [];
    for (const s of filtered) for (const c of s.components) rows.push([s.grade, s.scent, c.label, c.qty, c.reorder ?? ""]);
    downloadCsv("สติ๊กเกอร์และการ์ด", ["เกรด", "กลิ่น", "ชิ้นส่วน", "คงเหลือ", "จุดสั่งซื้อ"], rows);
  }

  return (
    <div className="space-y-4">
      <SummaryBar total={scents.length} unit="กลิ่น" lowCount={lowCount} lowOnly={lowOnly} setLowOnly={setLowOnly} onExport={exportCsv}>
        <div className="relative min-w-[180px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="ค้นหากลิ่น" />
        </div>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="input w-36">
          <option value="">เกรด: ทั้งหมด</option>
          {grades.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button onClick={() => setCollapsedGrade(new Set(groups.map((g) => g.grade)))} className="btn-ghost text-xs"><ChevronRight size={14} /> ย่อกรุป</button>
        <button onClick={() => setCollapsedGrade(new Set())} className="btn-ghost text-xs"><ChevronDown size={14} /> ขยายกรุป</button>
      </SummaryBar>

      <div className="space-y-4">
        {groups.length === 0 && <p className="card p-10 text-center text-sm text-muted">ไม่พบกลิ่น</p>}
        {groups.map((grp) => {
          const gOpen = !collapsedGrade.has(grp.grade);
          const totalQty = grp.scents.reduce((a, s) => a + s.components.reduce((x, c) => x + c.qty, 0), 0);
          const lowScents = grp.scents.filter(scentLow).length;
          return (
            <section key={grp.grade}>
              {/* หัวกรุปเกรด */}
              <button onClick={() => toggleGrade(grp.grade)}
                className="flex w-full items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-2.5 text-left">
                {gOpen ? <ChevronDown size={16} className="text-brand-500" /> : <ChevronRight size={16} className="text-brand-500" />}
                <span className="text-sm font-bold uppercase tracking-wide text-brand-700">{grp.grade}</span>
                <span className="text-xs text-muted">· {grp.scents.length} กลิ่น · รวม {totalQty.toLocaleString()}{lowScents > 0 && <span className="text-amber-600"> · ใกล้หมด {lowScents}</span>}</span>
              </button>

              {gOpen && (
                <div className="mt-2 space-y-2 sm:pl-4">
                  {grp.scents.map((s) => {
                    const open = !collapsedScent.has(s.scent);
                    const total = s.components.reduce((a, c) => a + c.qty, 0);
                    const low = s.components.filter((c) => isLow(c.qty, c.reorder)).length;
                    return (
                      <div key={s.scent} className="overflow-hidden rounded-xl border border-line bg-white">
                        <button onClick={() => toggleScent(s.scent)} className="flex w-full items-center gap-2 bg-soft/60 px-4 py-2 text-left">
                          {open ? <ChevronDown size={15} className="text-faint" /> : <ChevronRight size={15} className="text-faint" />}
                          <span className="font-medium text-ink">{s.scent}</span>
                          <span className="text-xs text-muted">· {s.components.length} ชิ้นส่วน · รวม {total.toLocaleString()}{low > 0 && <span className="text-amber-600"> · ใกล้หมด {low}</span>}</span>
                        </button>
                        {open && (
                          <div className="divide-y divide-line">
                            {s.components.map((c) => (
                              <div key={c.key} className="flex items-center justify-between gap-2 py-2 pl-6 pr-3 sm:pl-10 sm:pr-4">
                                <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.label}</span>
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
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
