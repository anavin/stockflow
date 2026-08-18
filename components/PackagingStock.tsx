"use client";
import { useMemo, useState } from "react";
import type { PackagingRow } from "@/lib/queries";
import MaterialControls, { isLow } from "./MaterialControls";
import { SummaryBar } from "./BulkStock";
import { downloadCsv } from "@/lib/csv";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

export default function PackagingStock({ rows, canEdit }: { rows: PackagingRow[]; canEdit: boolean }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());   // หมวด (default กาง)

  const cats = useMemo(() => [...new Set(rows.map((r) => r.category))], [rows]);
  const lowCount = useMemo(() => rows.filter((r) => isLow(r.qty, r.reorder)).length, [rows]);
  const t = search.trim().toLowerCase();
  const groups = useMemo(() => {
    const m = new Map<string, PackagingRow[]>();
    for (const r of rows) {
      if (t && !r.label.toLowerCase().includes(t)) continue;
      if (cat && r.category !== cat) continue;
      if (lowOnly && !isLow(r.qty, r.reorder)) continue;
      (m.get(r.category) ?? m.set(r.category, []).get(r.category)!).push(r);
    }
    return [...m.entries()].map(([category, items]) => ({ category, items }));
  }, [rows, t, cat, lowOnly]);

  const toggle = (k: string) => setCollapsed((c) => { const n = new Set(c); n.has(k) ? n.delete(k) : n.add(k); return n; });
  function exportCsv() {
    downloadCsv("ขวดและแพ็คเกจ", ["หมวด", "รายการ", "คงเหลือ", "จุดสั่งซื้อ"],
      rows.map((r) => [r.category, r.label, r.qty, r.reorder ?? ""]));
  }

  return (
    <div className="space-y-4">
      <SummaryBar total={rows.length} unit="รายการ" lowCount={lowCount} lowOnly={lowOnly} setLowOnly={setLowOnly} onExport={exportCsv}>
        <div className="relative min-w-[180px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="ค้นหารายการ" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="input w-40">
          <option value="">หมวด: ทั้งหมด</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setCollapsed(new Set(groups.map((g) => g.category)))} className="btn-ghost text-xs"><ChevronRight size={14} /> ย่อ</button>
        <button onClick={() => setCollapsed(new Set())} className="btn-ghost text-xs"><ChevronDown size={14} /> ขยาย</button>
      </SummaryBar>

      {/* การ์ดพับได้ต่อหมวด — สไตล์เดียวกับหน้าสติ๊กเกอร์ & การ์ด */}
      <div className="space-y-3">
        {groups.length === 0 && <p className="card p-10 text-center text-sm text-muted">ไม่พบรายการ</p>}
        {groups.map((grp) => {
          const open = !collapsed.has(grp.category);
          const total = grp.items.reduce((a, r) => a + r.qty, 0);
          const low = grp.items.filter((r) => isLow(r.qty, r.reorder)).length;
          return (
            <div key={grp.category} className="overflow-hidden rounded-xl border border-line bg-white">
              <button onClick={() => toggle(grp.category)} className="flex w-full items-center gap-2 bg-soft/60 px-4 py-2.5 text-left">
                {open ? <ChevronDown size={15} className="text-faint" /> : <ChevronRight size={15} className="text-faint" />}
                <span className="font-semibold text-ink">{grp.category}</span>
                <span className="text-xs text-muted">· {grp.items.length} รายการ · รวม {total.toLocaleString()}{low > 0 && <span className="text-amber-600"> · ใกล้หมด {low}</span>}</span>
              </button>
              {open && (
                <div className="divide-y divide-line">
                  {grp.items.map((r) => (
                    <div key={r.ref_key} className="flex items-center justify-between gap-3 px-4 py-2 sm:pl-6">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{r.label}</span>
                      <MaterialControls canEdit={canEdit} qty={r.qty} unit="ชิ้น" reorder={r.reorder}
                        desc={{ category: "packaging", refKey: r.ref_key, label: r.label, unit: "ชิ้น" }} />
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
