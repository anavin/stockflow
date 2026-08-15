"use client";
import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct, renameProduct, setProductActive, setProductCode, setProductType, setProductBarcode, bulkSetProductTypes } from "@/lib/actions/products";
import type { ProductAdminRow, ScentBarcode } from "@/lib/queries";
import { PERFUME_TYPES } from "@/lib/types";
import { Plus, Check, X, Pencil, Search, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";

type Filter = "all" | "untyped" | "typed";

export default function ProductsManager({
  products,
  sizesByScent = {},
}: {
  products: ProductAdminRow[];
  sizesByScent?: Record<string, ScentBarcode[]>;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [ptype, setPtype] = useState("");
  const [barcode, setBarcode] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [codeId, setCodeId] = useState<number | null>(null);
  const [codeVal, setCodeVal] = useState("");
  const [barId, setBarId] = useState<number | null>(null);
  const [barVal, setBarVal] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);   // แถวที่กางดูขนาด
  const [bulkType, setBulkType] = useState("");

  const sizesFor = (n: string) => sizesByScent[n.trim().toLowerCase()] ?? [];

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === "untyped" && p.ptype) return false;
      if (filter === "typed" && !p.ptype) return false;
      if (t && !(p.name.toLowerCase().includes(t) || (p.code ?? "").toLowerCase().includes(t) || (p.barcode ?? "").toLowerCase().includes(t))) return false;
      return true;
    });
  }, [products, q, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { "": 0 };
    PERFUME_TYPES.forEach((t) => (c[t] = 0));
    products.forEach((p) => { const v = p.ptype ?? ""; c[v] = (c[v] ?? 0) + 1; });
    return c;
  }, [products]);
  const activeCount = products.filter((p) => p.active).length;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMsg(""); setBusy(true);
    const res = await createProduct(name, code, ptype, barcode);
    setBusy(false);
    if (!res.ok) { setError(res.error || "เพิ่มไม่สำเร็จ"); return; }
    setMsg(`เพิ่มกลิ่น "${name.trim()}" แล้ว`); setName(""); setCode(""); setPtype(""); setBarcode(""); router.refresh();
  }
  async function changeType(id: number, v: string) {
    const res = await setProductType(id, v); if (!res.ok) { alert(res.error); return; } router.refresh();
  }
  async function saveRename(id: number) {
    const res = await renameProduct(id, editVal); if (!res.ok) { alert(res.error); return; } setEditId(null); router.refresh();
  }
  async function saveCode(id: number) {
    const res = await setProductCode(id, codeVal); if (!res.ok) { alert(res.error); return; } setCodeId(null); router.refresh();
  }
  async function saveBarcode(id: number) {
    const res = await setProductBarcode(id, barVal); if (!res.ok) { alert(res.error); return; } setBarId(null); router.refresh();
  }
  async function toggle(p: ProductAdminRow) {
    const res = await setProductActive(p.id, !p.active); if (!res.ok) { alert(res.error); return; } router.refresh();
  }
  async function applyBulk() {
    const rows = filtered;
    if (rows.length === 0) return;
    const label = bulkType || "— (ล้างประเภท)";
    if (!confirm(`ตั้งประเภท "${label}" ให้ ${rows.length} กลิ่นที่กรองอยู่?`)) return;
    setBusy(true); setMsg(""); setError("");
    const res = await bulkSetProductTypes(rows.map((p) => ({ id: p.id, ptype: bulkType })));
    setBusy(false);
    if (!res.ok) { setError(res.error || "บันทึกไม่สำเร็จ"); return; }
    setMsg(`ตั้งประเภท ${res.count} กลิ่นแล้ว`); router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* เพิ่มกลิ่นใหม่ */}
      <form onSubmit={add} className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Plus size={16} /> เพิ่มกลิ่นใหม่</h2>
        <div className="flex flex-wrap gap-2">
          <input className="input flex-1 min-w-[220px]" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อกลิ่น เช่น Volt - Twilight (EDT)" />
          <input className="input w-24 font-mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="รหัส" />
          <input className="input w-36 font-mono" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="บาร์โค้ด CTW" />
          <select className="input w-32" value={ptype} onChange={(e) => setPtype(e.target.value)}>
            <option value="">ประเภท…</option>
            {PERFUME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn-primary" disabled={busy}>{busy ? "กำลังเพิ่ม…" : "เพิ่มกลิ่น"}</button>
        </div>
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {msg && <p className="mt-2 flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"><CheckCircle2 size={14} /> {msg}</p>}
      </form>

      {/* สรุปประเภท */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip bg-soft text-ink">ทั้งหมด {products.length}</span>
        {PERFUME_TYPES.map((t) => <span key={t} className="chip bg-brand-50 text-brand-600">{t} {counts[t] ?? 0}</span>)}
        <span className={`chip ${(counts[""] ?? 0) > 0 ? "bg-amber-50 text-amber-700" : "bg-soft text-muted"}`}>ยังไม่จัดประเภท {counts[""] ?? 0}</span>
      </div>

      {/* toolbar: ค้นหา + ฟิลเตอร์ + ตั้งประเภทหลายแถว */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหากลิ่น / รหัส / บาร์โค้ด" />
          </div>
          <div className="flex overflow-hidden rounded-lg border border-line text-sm">
            {(["all", "untyped", "typed"] as Filter[]).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={`px-3 py-2 ${filter === f ? "bg-brand text-white" : "bg-white text-muted hover:bg-soft"}`}>
                {f === "all" ? "ทั้งหมด" : f === "untyped" ? "ยังไม่จัดประเภท" : "จัดแล้ว"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">ตั้งประเภท {filtered.length} แถวที่กรอง →</span>
          <select className="input w-28" value={bulkType} onChange={(e) => setBulkType(e.target.value)}>
            <option value="">— (ล้าง)</option>
            {PERFUME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button type="button" onClick={applyBulk} className="btn-ghost" disabled={busy || filtered.length === 0}>ใช้</button>
        </div>
      </div>

      {/* ตาราง */}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">ชื่อกลิ่น</th>
              <th className="px-3 py-3">รหัส</th>
              <th className="px-3 py-3">บาร์โค้ด CTW</th>
              <th className="px-3 py-3">ประเภท</th>
              <th className="px-3 py-3">ขนาด (CTW)</th>
              <th className="px-3 py-3 text-center">ใช้</th>
              <th className="px-3 py-3 text-center">สถานะ</th>
              <th className="px-3 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">ไม่พบกลิ่น</td></tr>}
            {filtered.map((p) => {
              const sizes = sizesFor(p.name);
              const open = openId === p.id;
              return (
                <Fragment key={p.id}>
                  <tr className={`border-t border-line ${!p.active ? "bg-soft/40" : ""}`}>
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
                    <td className="px-3 py-2.5">
                      {codeId === p.id ? (
                        <div className="flex items-center gap-1">
                          <input autoFocus className="input h-8 w-20 py-0 font-mono text-xs" value={codeVal} onChange={(e) => setCodeVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveCode(p.id); if (e.key === "Escape") setCodeId(null); }} />
                          <button onClick={() => saveCode(p.id)} className="rounded-md p-1 text-green-600 hover:bg-green-50"><Check size={15} /></button>
                          <button onClick={() => setCodeId(null)} className="rounded-md p-1 text-muted hover:bg-soft"><X size={15} /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setCodeId(p.id); setCodeVal(p.code ?? ""); }} className="rounded px-1.5 py-0.5 font-mono text-xs hover:bg-soft">
                          {p.code ? <span className="text-ink">{p.code}</span> : <span className="text-faint">—</span>}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {barId === p.id ? (
                        <div className="flex items-center gap-1">
                          <input autoFocus className="input h-8 w-32 py-0 font-mono text-xs" value={barVal} onChange={(e) => setBarVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveBarcode(p.id); if (e.key === "Escape") setBarId(null); }} placeholder="บาร์โค้ด CTW" />
                          <button onClick={() => saveBarcode(p.id)} className="rounded-md p-1 text-green-600 hover:bg-green-50"><Check size={15} /></button>
                          <button onClick={() => setBarId(null)} className="rounded-md p-1 text-muted hover:bg-soft"><X size={15} /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setBarId(p.id); setBarVal(p.barcode ?? ""); }} className="rounded px-1.5 py-0.5 font-mono text-xs hover:bg-soft">
                          {p.barcode ? <span className="text-ink">{p.barcode}</span> : <span className="text-faint">— ผูก</span>}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <select value={p.ptype ?? ""} onChange={(e) => changeType(p.id, e.target.value)} className="input h-8 w-24 py-0 text-xs" title="ประเภทน้ำหอม">
                        <option value="">—</option>
                        {PERFUME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      {sizes.length === 0 ? (
                        <span className="text-xs text-faint">—</span>
                      ) : (
                        <button onClick={() => setOpenId(open ? null : p.id)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-brand-600 hover:bg-brand-50">
                          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          {sizes.length} ขนาด
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-muted">{p.used > 0 ? p.used.toLocaleString() : "—"}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`chip ${p.active ? "bg-green-50 text-green-700" : "bg-soft text-muted"}`}>{p.active ? "ใช้งาน" : "ปิด"}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {editId !== p.id && (
                          <button onClick={() => { setEditId(p.id); setEditVal(p.name); }} className="rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink" title="แก้ชื่อ"><Pencil size={15} /></button>
                        )}
                        <button onClick={() => toggle(p)} className="rounded-md px-2 py-1 text-xs text-muted hover:bg-soft">{p.active ? "ปิด" : "เปิด"}</button>
                      </div>
                    </td>
                  </tr>
                  {open && sizes.length > 0 && (
                    <tr className="border-t border-line bg-soft/40">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="text-xs text-muted mb-1.5">ขนาด + บาร์โค้ด (EAN) จาก CTW</div>
                        <div className="flex flex-wrap gap-2">
                          {sizes.map((s) => (
                            <div key={s.barcode} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5">
                              <span className="text-xs font-semibold text-ink">{s.size}</span>
                              <span className="font-mono text-xs text-muted">{s.barcode}</span>
                              {s.sku && <span className="text-[11px] text-faint">{s.sku}</span>}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-faint">แก้ชื่อมีผลกับใบใหม่ (ใบเก่ายังเป็นชื่อเดิม) · บาร์โค้ด CTW = คีย์ผูกกับระบบขายหน้าร้าน · ขนาด (CTW) ดึงจาก master ของร้าน (เฉพาะกลิ่นที่ชื่อตรงกัน) · ใช้งาน {activeCount} · ทั้งหมด {products.length}</p>
    </div>
  );
}
