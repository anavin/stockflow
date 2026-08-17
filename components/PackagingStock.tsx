"use client";
import { Fragment, useMemo, useState } from "react";
import type { PackagingRow } from "@/lib/queries";
import MaterialControls, { isLow } from "./MaterialControls";
import { SummaryBar } from "./BulkStock";
import { downloadCsv } from "@/lib/csv";
import { Search } from "lucide-react";

export default function PackagingStock({ rows, canEdit }: { rows: PackagingRow[]; canEdit: boolean }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

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
    return [...m.entries()];
  }, [rows, t, cat, lowOnly]);

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
      </SummaryBar>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr><th className="px-4 py-3">รายการ</th><th className="px-3 py-3 text-right">คงเหลือ</th></tr>
          </thead>
          <tbody>
            {groups.length === 0 && <tr><td colSpan={2} className="px-4 py-12 text-center text-muted">ไม่พบรายการ</td></tr>}
            {groups.map(([c, items]) => (
              <Fragment key={c}>
                <tr className="border-t border-line bg-soft/70"><td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">{c} · {items.length}</td></tr>
                {items.map((r) => (
                  <tr key={r.ref_key} className="border-t border-line hover:bg-soft/40">
                    <td className="px-4 py-2.5 font-medium text-ink">{r.label}</td>
                    <td className="px-3 py-2.5">
                      <MaterialControls canEdit={canEdit} qty={r.qty} unit="ชิ้น" reorder={r.reorder}
                        desc={{ category: "packaging", refKey: r.ref_key, label: r.label, unit: "ชิ้น" }} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
