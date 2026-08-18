"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addBulkScent, setMaterialNote, type ItemDesc } from "@/lib/actions/supply";
import { bulkRef } from "@/lib/materials";
import type { BulkRow } from "@/lib/queries";
import MaterialControls, { isLow } from "./MaterialControls";
import { downloadCsv } from "@/lib/csv";
import { Plus, Search, FileDown, AlertTriangle, ChevronDown, ChevronRight, StickyNote } from "lucide-react";

// เรียงกลุ่มตาม Grade: EDP → EDP+ → PARFUM → EDT → อื่นๆ
const GRADE_ORDER = ["EDP", "EDP+", "PARFUM", "EDT"];
const gradeRank = (g: string | null) => { const i = GRADE_ORDER.indexOf((g || "").toUpperCase()); return i < 0 ? GRADE_ORDER.length : i; };
const descOf = (r: BulkRow): ItemDesc => ({ category: "bulk", refKey: bulkRef(r.scent, r.brand), scent: r.scent, brand: r.brand, grade: r.grade, label: r.scent, unit: "ml" });

export default function BulkStock({ rows, canEdit }: { rows: BulkRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [oem, setOem] = useState({ scent: "", brand: "PUNN", grade: "" });
  const [busy, setBusy] = useState(false);
  const toggle = (k: string) => setCollapsed((c) => { const n = new Set(c); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const grades = useMemo(() => [...new Set(rows.map((r) => r.grade).filter(Boolean))].sort() as string[], [rows]);
  const lowCount = useMemo(() => rows.filter((r) => isLow(r.qty, r.reorder)).length, [rows]);
  const t = search.trim().toLowerCase();
  const filtered = rows.filter((r) =>
    (!t || r.scent.toLowerCase().includes(t) || r.brand.toLowerCase().includes(t) || (r.note || "").toLowerCase().includes(t)) &&
    (!grade || r.grade === grade) &&
    (!lowOnly || isLow(r.qty, r.reorder)));

  // แบ่งกลุ่ม: Lab Parfumo ตาม Grade (บนสุด) → OEM แบรนด์อื่น (ล่างสุด)
  const groups = useMemo(() => {
    const lab = filtered.filter((r) => r.brand === "Lab Parfumo");
    const oemRows = filtered.filter((r) => r.brand !== "Lab Parfumo");
    const byGrade = new Map<string, BulkRow[]>();
    for (const r of lab) { const k = r.grade || "ไม่ระบุเกรด"; (byGrade.get(k) ?? byGrade.set(k, []).get(k)!).push(r); }
    const labGroups = [...byGrade.entries()]
      .sort((a, b) => gradeRank(a[0] === "ไม่ระบุเกรด" ? null : a[0]) - gradeRank(b[0] === "ไม่ระบุเกรด" ? null : b[0]) || a[0].localeCompare(b[0]))
      .map(([g, items]) => ({ key: g, title: g, oem: false, items: items.sort((a, b) => a.scent.localeCompare(b.scent, "en")) }));
    const out = [...labGroups];
    if (oemRows.length) out.push({ key: "__oem", title: `OEM · แบรนด์อื่น (${oemRows.length})`, oem: true, items: oemRows.sort((a, b) => a.brand.localeCompare(b.brand, "en") || a.scent.localeCompare(b.scent, "en")) });
    return out;
  }, [filtered]);

  async function addOem(e: React.FormEvent) {
    e.preventDefault(); if (!oem.scent.trim()) return;
    setBusy(true); const r = await addBulkScent(oem.scent, oem.brand, oem.grade || null); setBusy(false);
    if (!r.ok) { alert(r.error); return; }
    setOem({ ...oem, scent: "" }); router.refresh();
  }
  function exportCsv() {
    downloadCsv("น้ำหอมยังไม่บรรจุ", ["Grade", "กลิ่น", "Brand", "ปริมาตร (ml)", "จุดสั่งซื้อ", "หมายเหตุ"],
      filtered.map((r) => [r.grade || "", r.scent, r.brand, r.qty, r.reorder ?? "", r.note ?? ""]));
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="ค้นหากลิ่น / Brand / หมายเหตุ" />
        </div>
        {grades.length > 0 && (
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className="input w-32">
            <option value="">Grade: ทั้งหมด</option>
            {grades.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
        <button onClick={() => setCollapsed(new Set(groups.map((g) => g.key)))} className="btn-ghost text-xs"><ChevronRight size={14} /> ย่อ</button>
        <button onClick={() => setCollapsed(new Set())} className="btn-ghost text-xs"><ChevronDown size={14} /> ขยาย</button>
      </SummaryBar>

      {/* การ์ดพับได้ต่อกลุ่ม Grade — สไตล์เดียวกับหน้าสติ๊กเกอร์ & การ์ด */}
      <div className="space-y-3">
        {groups.length === 0 && <p className="card p-10 text-center text-sm text-muted">ไม่พบกลิ่น</p>}
        {groups.map((grp) => {
          const open = !collapsed.has(grp.key);
          const total = grp.items.reduce((a, r) => a + r.qty, 0);
          const low = grp.items.filter((r) => isLow(r.qty, r.reorder)).length;
          return (
            <div key={grp.key} className="overflow-hidden rounded-xl border border-line bg-white">
              <button onClick={() => toggle(grp.key)} className={`flex w-full items-center gap-2 px-4 py-2.5 text-left ${grp.oem ? "bg-purple-50/60" : "bg-soft/60"}`}>
                {open ? <ChevronDown size={15} className="text-faint" /> : <ChevronRight size={15} className="text-faint" />}
                <span className={`font-semibold ${grp.oem ? "text-purple-700" : "text-ink"}`}>{grp.oem ? "OEM · แบรนด์อื่น" : grp.title}</span>
                <span className="text-xs text-muted">· {grp.items.length} กลิ่น · รวม {total.toLocaleString()} ml{low > 0 && <span className="text-amber-600"> · ใกล้หมด {low}</span>}</span>
              </button>
              {open && (
                <div className="divide-y divide-line">
                  {grp.items.map((r) => (
                    <div key={r.brand + "|" + r.scent} className="group flex items-center justify-between gap-3 px-4 py-2 sm:pl-6">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-ink">{r.scent}</span>
                        {grp.oem && <span className="chip bg-purple-50 text-purple-700">{r.brand}</span>}
                        {grp.oem && r.grade && <span className="text-xs text-muted">{r.grade}</span>}
                        <NoteInline row={r} canEdit={canEdit} />
                      </div>
                      <MaterialControls canEdit={canEdit} qty={r.qty} unit="ml" reorder={r.reorder} desc={descOf(r)} />
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

/** หมายเหตุแบบ inline ต่อท้ายชื่อ — มีค่า = โชว์ป้าย · ไม่มี = ปุ่มจางๆ "+ หมายเหตุ" (กดแล้วพิมพ์) */
function NoteInline({ row, canEdit }: { row: BulkRow; canEdit: boolean }) {
  const router = useRouter();
  const orig = row.note ?? "";
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(orig);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (val.trim() === orig.trim()) { setEditing(false); return; }
    setBusy(true); const r = await setMaterialNote(descOf(row), val); setBusy(false);
    if (!r.ok) { alert(r.error); setVal(orig); setEditing(false); return; }
    setEditing(false); router.refresh();
  }

  if (editing) {
    return (
      <input autoFocus value={val} disabled={busy}
        onChange={(e) => setVal(e.target.value)} onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setVal(orig); setEditing(false); } }}
        className="input h-7 w-52 max-w-full py-0 text-xs disabled:opacity-50" placeholder="พิมพ์หมายเหตุ… (Enter บันทึก)" />
    );
  }
  // มีหมายเหตุ → ป้ายเหลืองต่อท้ายชื่อ (กดแก้ได้)
  if (orig) {
    return (
      <button type="button" onClick={() => canEdit && setEditing(true)} title={canEdit ? "แก้หมายเหตุ" : orig}
        className={`inline-flex max-w-[18rem] items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 ${canEdit ? "hover:bg-amber-100" : "cursor-default"}`}>
        <StickyNote size={11} className="shrink-0 opacity-70" />
        <span className="truncate">{orig}</span>
      </button>
    );
  }
  // ไม่มีหมายเหตุ → ปุ่มจางๆ (โผล่ตอน hover บนคอม · จางๆ บนมือถือ)
  if (!canEdit) return null;
  return (
    <button type="button" onClick={() => setEditing(true)}
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] text-faint opacity-0 transition-opacity hover:bg-soft hover:text-muted group-hover:opacity-100 max-sm:opacity-60">
      <Plus size={11} /> หมายเหตุ
    </button>
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
