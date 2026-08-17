"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addBulkScent } from "@/lib/actions/supply";
import { bulkRef } from "@/lib/materials";
import type { BulkRow } from "@/lib/queries";
import MaterialControls, { isLow } from "./MaterialControls";
import { downloadCsv } from "@/lib/csv";
import { Plus, Search, FileDown, AlertTriangle } from "lucide-react";

export default function BulkStock({ rows, canEdit }: { rows: BulkRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [oem, setOem] = useState({ scent: "", brand: "PUNN", grade: "" });
  const [busy, setBusy] = useState(false);

  const grades = useMemo(() => [...new Set(rows.map((r) => r.grade).filter(Boolean))].sort() as string[], [rows]);
  const lowCount = useMemo(() => rows.filter((r) => isLow(r.qty, r.reorder)).length, [rows]);
  const t = search.trim().toLowerCase();
  const filtered = rows.filter((r) =>
    (!t || r.scent.toLowerCase().includes(t) || r.brand.toLowerCase().includes(t)) &&
    (!grade || r.grade === grade) &&
    (!lowOnly || isLow(r.qty, r.reorder)));

  async function addOem(e: React.FormEvent) {
    e.preventDefault(); if (!oem.scent.trim()) return;
    setBusy(true); const r = await addBulkScent(oem.scent, oem.brand, oem.grade || null); setBusy(false);
    if (!r.ok) { alert(r.error); return; }
    setOem({ ...oem, scent: "" }); router.refresh();
  }
  function exportCsv() {
    downloadCsv("ปริมาตรน้ำหอม", ["กลิ่น", "Brand", "Grade", "ปริมาตร (ml)", "จุดสั่งซื้อ"],
      filtered.map((r) => [r.scent, r.brand, r.grade || "", r.qty, r.reorder ?? ""]));
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <form onSubmit={addOem} className="card flex flex-wrap items-end gap-2 p-4">
          <div className="flex-1 min-w-[160px]">
            <label className="label">เพิ่มกลิ่น OEM</label>
            <input className="input" value={oem.scent} onChange={(e) => setOem((s) => ({ ...s, scent: e.target.value }))} placeholder="ชื่อกลิ่น OEM" />
          </div>
          <div>
            <label className="label">Brand</label>
            <input className="input w-32" value={oem.brand} onChange={(e) => setOem((s) => ({ ...s, brand: e.target.value }))} placeholder="PUNN / Atepole" list="oem-brands" />
            <datalist id="oem-brands"><option value="PUNN" /><option value="Atepole" /></datalist>
          </div>
          <div>
            <label className="label">Grade</label>
            <input className="input w-24" value={oem.grade} onChange={(e) => setOem((s) => ({ ...s, grade: e.target.value }))} placeholder="EDP" />
          </div>
          <button className="btn-primary" disabled={busy}><Plus size={15} /> เพิ่ม</button>
        </form>
      )}

      <SummaryBar total={rows.length} unit="กลิ่น" lowCount={lowCount} lowOnly={lowOnly} setLowOnly={setLowOnly} onExport={exportCsv}>
        <div className="relative min-w-[180px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="ค้นหากลิ่น / Brand" />
        </div>
        {grades.length > 0 && (
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className="input w-32">
            <option value="">Grade: ทั้งหมด</option>
            {grades.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
      </SummaryBar>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">กลิ่น</th>
              <th className="px-3 py-3">Brand</th>
              <th className="px-3 py-3">Grade</th>
              <th className="px-3 py-3 text-right">ปริมาตรคงเหลือ (ml)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted">ไม่พบกลิ่น</td></tr>}
            {filtered.map((r) => (
              <tr key={r.brand + "|" + r.scent} className="border-t border-line hover:bg-soft/40">
                <td className="px-4 py-2.5 font-medium text-ink">{r.scent}</td>
                <td className="px-3 py-2.5"><span className={`chip ${r.brand === "Lab Parfumo" ? "bg-brand-50 text-brand-600" : "bg-purple-50 text-purple-700"}`}>{r.brand}</span></td>
                <td className="px-3 py-2.5 text-muted">{r.grade || "—"}</td>
                <td className="px-3 py-2.5">
                  <MaterialControls canEdit={canEdit} qty={r.qty} unit="ml" reorder={r.reorder}
                    desc={{ category: "bulk", refKey: bulkRef(r.scent, r.brand), scent: r.scent, brand: r.brand, grade: r.grade, label: r.scent, unit: "ml" }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** แถบสรุป + ค้นหา/ฟิลเตอร์ + Export — ใช้ร่วมทุกหน้าวัตถุดิบ */
export function SummaryBar({ total, unit, lowCount, lowOnly, setLowOnly, onExport, children }: {
  total: number; unit: string; lowCount: number; lowOnly: boolean; setLowOnly: (v: boolean) => void; onExport: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-wrap items-center gap-2 p-3">
      {children}
      <button onClick={() => setLowOnly(!lowOnly)}
        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${lowOnly ? "border-amber-300 bg-amber-50 text-amber-700" : "border-line text-muted hover:bg-soft"}`}>
        <AlertTriangle size={13} /> ใกล้หมด {lowCount > 0 && <span className={`rounded-full px-1.5 ${lowOnly ? "bg-amber-200" : "bg-amber-100 text-amber-700"}`}>{lowCount}</span>}
      </button>
      <button onClick={onExport} className="btn-ghost text-xs" title="ดาวน์โหลด CSV"><FileDown size={14} /> Export</button>
      <span className="ml-auto text-xs text-muted">{total.toLocaleString()} {unit}{lowCount > 0 && <> · <span className="text-amber-600">ใกล้หมด {lowCount}</span></>}</span>
    </div>
  );
}
