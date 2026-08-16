"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addSpecOption, renameSpecOption, setSpecOptionActive, deleteSpecOption } from "@/lib/actions/specs";
import type { SpecOptionRow } from "@/lib/queries";
import { Plus, Check, X, Pencil, Trash2, CheckCircle2 } from "lucide-react";

export default function SpecManager({ specs }: { specs: SpecOptionRow[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMsg(""); setBusy(true);
    const res = await addSpecOption(label);
    setBusy(false);
    if (!res.ok) { setError(res.error || "เพิ่มไม่สำเร็จ"); return; }
    setMsg(`เพิ่มสเป็ก "${label.trim()}" แล้ว`); setLabel(""); router.refresh();
  }
  async function saveRename(id: number) {
    const res = await renameSpecOption(id, editVal);
    if (!res.ok) { alert(res.error); return; }
    setEditId(null); router.refresh();
  }
  async function toggle(s: SpecOptionRow) {
    const res = await setSpecOptionActive(s.id, !s.active);
    if (!res.ok) { alert(res.error); return; }
    router.refresh();
  }
  async function remove(s: SpecOptionRow) {
    if (!confirm(`ลบสเป็ก "${s.label}"?`)) return;
    const res = await deleteSpecOption(s.id);
    if (!res.ok) { alert(res.error); return; }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Plus size={16} /> เพิ่มสเป็กใหม่</h2>
        <div className="flex flex-wrap gap-2">
          <input className="input flex-1 min-w-[220px]" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ชื่อสเป็ก เช่น ฝาสีเงิน / ซองซิป" />
          <button className="btn-primary" disabled={busy}>{busy ? "กำลังเพิ่ม…" : "เพิ่มสเป็ก"}</button>
        </div>
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {msg && <p className="mt-2 flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"><CheckCircle2 size={14} /> {msg}</p>}
        <p className="mt-2 text-xs text-faint">สเป็กที่เปิดใช้จะขึ้นใน dropdown ตอนตัดสต๊อก · ปิด = ซ่อนจาก dropdown (ของเก่าที่เคยเลือกไว้ยังอยู่)</p>
      </form>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">สเป็ก</th>
              <th className="px-4 py-3 text-center">สถานะ</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {specs.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-muted">ยังไม่มีสเป็ก</td></tr>}
            {specs.map((s) => (
              <tr key={s.id} className={`border-t border-line ${!s.active ? "bg-soft/40" : ""}`}>
                <td className="px-4 py-2.5">
                  {editId === s.id ? (
                    <div className="flex items-center gap-1">
                      <input autoFocus className="input h-8 py-0" value={editVal} onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveRename(s.id); if (e.key === "Escape") setEditId(null); }} />
                      <button onClick={() => saveRename(s.id)} className="rounded-md p-1.5 text-green-600 hover:bg-green-50" title="บันทึก"><Check size={16} /></button>
                      <button onClick={() => setEditId(null)} className="rounded-md p-1.5 text-muted hover:bg-soft" title="ยกเลิก"><X size={16} /></button>
                    </div>
                  ) : (
                    <span className={s.active ? "font-medium text-ink" : "text-muted line-through"}>{s.label}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`chip ${s.active ? "bg-green-50 text-green-700" : "bg-soft text-muted"}`}>{s.active ? "ใช้งาน" : "ปิด"}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {editId !== s.id && (
                      <button onClick={() => { setEditId(s.id); setEditVal(s.label); }} className="rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink" title="แก้ชื่อ"><Pencil size={15} /></button>
                    )}
                    <button onClick={() => toggle(s)} className="rounded-md px-2 py-1 text-xs text-muted hover:bg-soft">{s.active ? "ปิด" : "เปิด"}</button>
                    <button onClick={() => remove(s)} className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600" title="ลบ"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
