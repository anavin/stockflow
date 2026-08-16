"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addSpecOption, renameSpecOption, setSpecOptionActive, deleteSpecOption, setSpecOptionBag,
  addSpecRule, updateSpecRule, setSpecRuleActive, deleteSpecRule,
} from "@/lib/actions/specs";
import type { SpecOptionRow, SpecRuleRow } from "@/lib/queries";
import { Plus, Check, X, Pencil, Trash2, CheckCircle2, ShoppingBag, Wand2 } from "lucide-react";

export default function SpecManager({ specs, rules }: { specs: SpecOptionRow[]; rules: SpecRuleRow[] }) {
  const router = useRouter();
  const specLabels = specs.filter((s) => s.active).map((s) => s.label);

  // ---- spec_options ----
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");

  async function addOpt(e: React.FormEvent) {
    e.preventDefault(); setError(""); setMsg(""); setBusy(true);
    const res = await addSpecOption(label); setBusy(false);
    if (!res.ok) { setError(res.error || "เพิ่มไม่สำเร็จ"); return; }
    setMsg(`เพิ่มสเป็ก "${label.trim()}" แล้ว`); setLabel(""); router.refresh();
  }
  async function saveRename(id: number) { const r = await renameSpecOption(id, editVal); if (!r.ok) return alert(r.error); setEditId(null); router.refresh(); }
  async function toggleOpt(s: SpecOptionRow) { const r = await setSpecOptionActive(s.id, !s.active); if (!r.ok) return alert(r.error); router.refresh(); }
  async function toggleBag(s: SpecOptionRow) { const r = await setSpecOptionBag(s.id, !s.for_bag); if (!r.ok) return alert(r.error); router.refresh(); }
  async function removeOpt(s: SpecOptionRow) { if (!confirm(`ลบสเป็ก "${s.label}"?`)) return; const r = await deleteSpecOption(s.id); if (!r.ok) return alert(r.error); router.refresh(); }

  // ---- spec_rules ----
  const [rSizes, setRSizes] = useState("");
  const [rGrades, setRGrades] = useState("");
  const [rSpec, setRSpec] = useState("");
  const [rErr, setRErr] = useState("");
  const [reId, setReId] = useState<number | null>(null);
  const [reSizes, setReSizes] = useState("");
  const [reGrades, setReGrades] = useState("");
  const [reSpec, setReSpec] = useState("");

  async function addRule(e: React.FormEvent) {
    e.preventDefault(); setRErr(""); setBusy(true);
    const res = await addSpecRule(rSizes, rGrades, rSpec); setBusy(false);
    if (!res.ok) { setRErr(res.error || "เพิ่มไม่สำเร็จ"); return; }
    setRSizes(""); setRGrades(""); setRSpec(""); router.refresh();
  }
  function startEdit(r: SpecRuleRow) { setReId(r.id); setReSizes(r.sizes); setReGrades(r.grades); setReSpec(r.spec); }
  async function saveRule(id: number) { const r = await updateSpecRule(id, reSizes, reGrades, reSpec); if (!r.ok) return alert(r.error); setReId(null); router.refresh(); }
  async function toggleRule(r: SpecRuleRow) { const res = await setSpecRuleActive(r.id, !r.active); if (!res.ok) return alert(res.error); router.refresh(); }
  async function removeRule(r: SpecRuleRow) { if (!confirm("ลบเงื่อนไขนี้?")) return; const res = await deleteSpecRule(r.id); if (!res.ok) return alert(res.error); router.refresh(); }

  const specSelect = (val: string, on: (v: string) => void) => (
    <select className="input h-9 w-32 text-sm" value={val} onChange={(e) => on(e.target.value)}>
      <option value="">เลือกสเป็ก…</option>
      {specLabels.map((l) => <option key={l} value={l}>{l}</option>)}
    </select>
  );

  return (
    <div className="space-y-8">
      {/* ========== รายการสเป็ก ========== */}
      <section className="space-y-4">
        <form onSubmit={addOpt} className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Plus size={16} /> เพิ่มสเป็กใหม่</h2>
          <div className="flex flex-wrap gap-2">
            <input className="input flex-1 min-w-[220px]" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ชื่อสเป็ก เช่น ฝาสีเงิน / ซองซิป" />
            <button className="btn-primary" disabled={busy}>{busy ? "กำลังเพิ่ม…" : "เพิ่มสเป็ก"}</button>
          </div>
          {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {msg && <p className="mt-2 flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"><CheckCircle2 size={14} /> {msg}</p>}
          <p className="mt-2 text-xs text-faint">ติ๊ก <ShoppingBag size={11} className="inline" /> ถุงกระดาษ = สเป็กนี้จะโชว์เฉพาะสินค้าถุง (ซ่อนจากสินค้าปกติ) เช่น Size S / Size M</p>
        </form>

        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">สเป็ก</th>
                <th className="px-4 py-3 text-center">ถุงกระดาษ</th>
                <th className="px-4 py-3 text-center">สถานะ</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {specs.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">ยังไม่มีสเป็ก</td></tr>}
              {specs.map((s) => (
                <tr key={s.id} className={`border-t border-line ${!s.active ? "bg-soft/40" : ""}`}>
                  <td className="px-4 py-2.5">
                    {editId === s.id ? (
                      <div className="flex items-center gap-1">
                        <input autoFocus className="input h-8 py-0" value={editVal} onChange={(e) => setEditVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveRename(s.id); if (e.key === "Escape") setEditId(null); }} />
                        <button onClick={() => saveRename(s.id)} className="rounded-md p-1.5 text-green-600 hover:bg-green-50"><Check size={16} /></button>
                        <button onClick={() => setEditId(null)} className="rounded-md p-1.5 text-muted hover:bg-soft"><X size={16} /></button>
                      </div>
                    ) : (
                      <span className={s.active ? "font-medium text-ink" : "text-muted line-through"}>{s.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => toggleBag(s)} title="สลับ: สเป็กเฉพาะถุงกระดาษ"
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${s.for_bag ? "bg-amber-50 text-amber-700" : "text-faint hover:bg-soft"}`}>
                      <ShoppingBag size={13} /> {s.for_bag ? "ใช่" : "—"}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`chip ${s.active ? "bg-green-50 text-green-700" : "bg-soft text-muted"}`}>{s.active ? "ใช้งาน" : "ปิด"}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {editId !== s.id && <button onClick={() => { setEditId(s.id); setEditVal(s.label); }} className="rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink" title="แก้ชื่อ"><Pencil size={15} /></button>}
                      <button onClick={() => toggleOpt(s)} className="rounded-md px-2 py-1 text-xs text-muted hover:bg-soft">{s.active ? "ปิด" : "เปิด"}</button>
                      <button onClick={() => removeOpt(s)} className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600" title="ลบ"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========== เงื่อนไขเลือกสเป็กอัตโนมัติ ========== */}
      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink"><Wand2 size={18} className="text-brand" /> เงื่อนไขเลือกสเป็กอัตโนมัติ</h2>
          <p className="mt-0.5 text-sm text-muted">เมื่อดึงใบเบิกมาตัดสต๊อก ระบบจะเลือกสเป็กให้อัตโนมัติตาม <b>ขนาด</b> + <b>Grade</b> ของสินค้า (ใส่หลายค่าได้ คั่นด้วย comma)</p>
        </div>

        <form onSubmit={addRule} className="card flex flex-wrap items-end gap-2 p-4">
          <div><label className="label">ขนาด</label><input className="input h-9 w-32 text-sm" value={rSizes} onChange={(e) => setRSizes(e.target.value)} placeholder="เช่น 30 ml,50 ml" /></div>
          <div><label className="label">Grade</label><input className="input h-9 w-36 text-sm" value={rGrades} onChange={(e) => setRGrades(e.target.value)} placeholder="เช่น EDP+,PARFUM" /></div>
          <div><label className="label">→ สเป็ก</label>{specSelect(rSpec, setRSpec)}</div>
          <button className="btn-primary h-9" disabled={busy}><Plus size={15} /> เพิ่มเงื่อนไข</button>
          {rErr && <p className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{rErr}</p>}
        </form>

        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">ขนาด</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">→ สเป็ก</th>
                <th className="px-4 py-3 text-center">สถานะ</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">ยังไม่มีเงื่อนไข</td></tr>}
              {rules.map((r) => (
                <tr key={r.id} className={`border-t border-line ${!r.active ? "bg-soft/40" : ""}`}>
                  {reId === r.id ? (
                    <>
                      <td className="px-4 py-2"><input className="input h-8 w-32 text-xs" value={reSizes} onChange={(e) => setReSizes(e.target.value)} /></td>
                      <td className="px-4 py-2"><input className="input h-8 w-36 text-xs" value={reGrades} onChange={(e) => setReGrades(e.target.value)} /></td>
                      <td className="px-4 py-2">{specSelect(reSpec, setReSpec)}</td>
                      <td className="px-4 py-2 text-center text-xs text-muted">—</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => saveRule(r.id)} className="rounded-md p-1.5 text-green-600 hover:bg-green-50"><Check size={16} /></button>
                          <button onClick={() => setReId(null)} className="rounded-md p-1.5 text-muted hover:bg-soft"><X size={16} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5">{r.sizes.split(",").map((s) => <span key={s} className="chip mr-1 bg-soft text-ink">{s.trim()}</span>)}</td>
                      <td className="px-4 py-2.5">{r.grades.split(",").map((g) => <span key={g} className="chip mr-1 bg-brand-50 text-brand-600">{g.trim()}</span>)}</td>
                      <td className="px-4 py-2.5 font-medium text-ink">{r.spec}</td>
                      <td className="px-4 py-2.5 text-center"><span className={`chip ${r.active ? "bg-green-50 text-green-700" : "bg-soft text-muted"}`}>{r.active ? "ใช้งาน" : "ปิด"}</span></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => startEdit(r)} className="rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink" title="แก้ไข"><Pencil size={15} /></button>
                          <button onClick={() => toggleRule(r)} className="rounded-md px-2 py-1 text-xs text-muted hover:bg-soft">{r.active ? "ปิด" : "เปิด"}</button>
                          <button onClick={() => removeRule(r)} className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600" title="ลบ"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
