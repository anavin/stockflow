"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct, renameProduct, setProductActive, setProductCode, setProductType } from "@/lib/actions/products";
import type { ProductAdminRow } from "@/lib/queries";
import { PERFUME_TYPES } from "@/lib/types";
import { Plus, Check, X, Pencil, Search, CheckCircle2 } from "lucide-react";

export default function ProductsManager({ products }: { products: ProductAdminRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [ptype, setPtype] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [codeId, setCodeId] = useState<number | null>(null);   // แก้รหัส inline
  const [codeVal, setCodeVal] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? products.filter((p) => p.name.toLowerCase().includes(t) || (p.code ?? "").toLowerCase().includes(t)) : products;
  }, [products, q]);
  const activeCount = products.filter((p) => p.active).length;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMsg(""); setBusy(true);
    const res = await createProduct(name, code, ptype);
    setBusy(false);
    if (!res.ok) { setError(res.error || "เพิ่มไม่สำเร็จ"); return; }
    setMsg(`เพิ่มกลิ่น "${name.trim()}" แล้ว`); setName(""); setCode(""); setPtype(""); router.refresh();
  }
  async function changeType(id: number, v: string) {
    const res = await setProductType(id, v);
    if (!res.ok) { alert(res.error); return; }
    router.refresh();
  }
  async function saveRename(id: number) {
    const res = await renameProduct(id, editVal);
    if (!res.ok) { alert(res.error); return; }
    setEditId(null); router.refresh();
  }
  async function saveCode(id: number) {
    const res = await setProductCode(id, codeVal);
    if (!res.ok) { alert(res.error); return; }
    setCodeId(null); router.refresh();
  }
  async function toggle(p: ProductAdminRow) {
    const res = await setProductActive(p.id, !p.active);
    if (!res.ok) { alert(res.error); return; }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Plus size={16} /> เพิ่มกลิ่นใหม่</h2>
        <div className="flex flex-wrap gap-2">
          <input className="input flex-1 min-w-[220px]" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อกลิ่น เช่น Volt - Twilight (EDT)" />
          <input className="input w-28 font-mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="รหัส" />
          <select className="input w-36" value={ptype} onChange={(e) => setPtype(e.target.value)}>
            <option value="">ประเภท…</option>
            {PERFUME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn-primary" disabled={busy}>{busy ? "กำลังเพิ่ม…" : "เพิ่มกลิ่น"}</button>
        </div>
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {msg && <p className="mt-2 flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"><CheckCircle2 size={14} /> {msg}</p>}
        <p className="mt-2 text-xs text-faint">กลิ่นที่เพิ่มจะขึ้นใน dropdown ตอนสร้างใบเบิก + ช่วยให้ import จับกลิ่นได้ · แก้ชื่อมีผลกับใบใหม่ (ใบเก่ายังเป็นชื่อเดิม)</p>
      </form>

      <div className="flex items-center justify-between gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหากลิ่น" />
        </div>
        <div className="text-xs text-muted">ใช้งาน {activeCount} · ทั้งหมด {products.length}</div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">ชื่อกลิ่น</th>
              <th className="px-4 py-3">รหัส</th>
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3 text-center">ใช้ในใบเบิก</th>
              <th className="px-4 py-3 text-center">สถานะ</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">ไม่พบกลิ่น</td></tr>}
            {filtered.map((p) => (
              <tr key={p.id} className={`border-t border-line ${!p.active ? "bg-soft/40" : ""}`}>
                <td className="px-4 py-2.5">
                  {editId === p.id ? (
                    <div className="flex items-center gap-1">
                      <input autoFocus className="input h-8 py-0" value={editVal} onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveRename(p.id); if (e.key === "Escape") setEditId(null); }} />
                      <button onClick={() => saveRename(p.id)} className="rounded-md p-1.5 text-green-600 hover:bg-green-50" title="บันทึก"><Check size={16} /></button>
                      <button onClick={() => setEditId(null)} className="rounded-md p-1.5 text-muted hover:bg-soft" title="ยกเลิก"><X size={16} /></button>
                    </div>
                  ) : (
                    <span className={p.active ? "font-medium text-ink" : "text-muted line-through"}>{p.name}</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {codeId === p.id ? (
                    <div className="flex items-center gap-1">
                      <input autoFocus className="input h-8 w-24 py-0 font-mono text-xs" value={codeVal} onChange={(e) => setCodeVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveCode(p.id); if (e.key === "Escape") setCodeId(null); }} />
                      <button onClick={() => saveCode(p.id)} className="rounded-md p-1 text-green-600 hover:bg-green-50" title="บันทึก"><Check size={15} /></button>
                      <button onClick={() => setCodeId(null)} className="rounded-md p-1 text-muted hover:bg-soft" title="ยกเลิก"><X size={15} /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setCodeId(p.id); setCodeVal(p.code ?? ""); }}
                      className="rounded px-1.5 py-0.5 font-mono text-xs hover:bg-soft">
                      {p.code ? <span className="text-ink">{p.code}</span> : <span className="text-faint">— เพิ่มรหัส</span>}
                    </button>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <select value={p.ptype ?? ""} onChange={(e) => changeType(p.id, e.target.value)}
                    className="input h-8 w-28 py-0 text-xs" title="ประเภทน้ำหอม">
                    <option value="">—</option>
                    {PERFUME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2.5 text-center text-muted">{p.used > 0 ? p.used.toLocaleString() : "—"}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`chip ${p.active ? "bg-green-50 text-green-700" : "bg-soft text-muted"}`}>{p.active ? "ใช้งาน" : "ปิด"}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {editId !== p.id && (
                      <button onClick={() => { setEditId(p.id); setEditVal(p.name); }} className="rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink" title="แก้ชื่อ"><Pencil size={15} /></button>
                    )}
                    <button onClick={() => toggle(p)} className="rounded-md px-2 py-1 text-xs text-muted hover:bg-soft">{p.active ? "ปิด" : "เปิด"}</button>
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
