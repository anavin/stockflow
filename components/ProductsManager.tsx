"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createProduct, renameProduct, setProductActive, setProductType, bulkSetProductTypes, addScentBarcode, deleteScentBarcode, setDiscontinued, deleteProduct } from "@/lib/actions/products";
import type { ProductAdminRow, ScentBarcode } from "@/lib/queries";
import { PERFUME_TYPES } from "@/lib/types";
import { Plus, Check, X, Pencil, Search, CheckCircle2, Ban, Trash2 } from "lucide-react";

type Filter = "all" | "untyped" | "typed" | "discontinued";
const normKey = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");

export default function ProductsManager({
  products,
  sizesByScent = {},
  discontinued = {},
  sizes = [],
  isAdmin = false,
}: {
  products: ProductAdminRow[];
  sizesByScent?: Record<string, ScentBarcode[]>;
  discontinued?: Record<string, string[]>;
  sizes?: string[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ptype, setPtype] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [bulkType, setBulkType] = useState("");
  // เพิ่มบาร์โค้ดเองต่อกลิ่น
  const [addId, setAddId] = useState<number | null>(null);
  const [aSize, setASize] = useState("");
  const [aBarcode, setABarcode] = useState("");
  const [aSku, setASku] = useState("");

  const sizesFor = (n: string) => sizesByScent[normKey(n)] ?? [];
  const discSizes = (n: string) => discontinued[normKey(n)] ?? [];     // ขนาดที่เลิกผลิตของกลิ่นนี้ (normalized)
  const isDisc = (n: string, size: string) => discSizes(n).includes(normKey(size));

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === "untyped" && p.ptype) return false;
      if (filter === "typed" && !p.ptype) return false;
      if (filter === "discontinued" && discSizes(p.name).length === 0) return false;
      if (t && !p.name.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [products, q, filter, discontinued]);
  const discCount = useMemo(() => products.filter((p) => discSizes(p.name).length > 0).length, [products, discontinued]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { "": 0 };
    PERFUME_TYPES.forEach((t) => (c[t] = 0));
    products.forEach((p) => { const v = p.ptype ?? ""; c[v] = (c[v] ?? 0) + 1; });
    return c;
  }, [products]);
  const activeCount = products.filter((p) => p.active).length;

  // มาจากทางลัด "เพิ่มบาร์โค้ด" ในหน้าสต๊อก (/products?scent=..&size=..) → เปิดฟอร์มกลิ่นนั้น + เลื่อนไปหา
  const sp = useSearchParams();
  useEffect(() => {
    const scent = sp.get("scent"); if (!scent) return;
    const p = products.find((x) => normKey(x.name) === normKey(scent));
    if (!p) return;
    setQ(scent);
    setAddId(p.id); setASize(sp.get("size") || ""); setABarcode(""); setASku("");
    setTimeout(() => document.getElementById(`prod-${p.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMsg(""); setBusy(true);
    const res = await createProduct(name, "", ptype);
    setBusy(false);
    if (!res.ok) { setError(res.error || "เพิ่มไม่สำเร็จ"); return; }
    setMsg(`เพิ่มกลิ่น "${name.trim()}" แล้ว`); setName(""); setPtype(""); router.refresh();
  }
  async function changeType(id: number, v: string) {
    const res = await setProductType(id, v); if (!res.ok) { alert(res.error); return; } router.refresh();
  }
  async function saveRename(id: number) {
    const res = await renameProduct(id, editVal); if (!res.ok) { alert(res.error); return; } setEditId(null); router.refresh();
  }
  async function toggle(p: ProductAdminRow) {
    const res = await setProductActive(p.id, !p.active); if (!res.ok) { alert(res.error); return; } router.refresh();
  }
  async function del(p: ProductAdminRow) {
    if (p.used > 0) { alert(`กลิ่นนี้มีในใบเบิก ${p.used.toLocaleString()} รายการ — ปิดการใช้งานแทน (ลบไม่ได้ กันประวัติเสีย)`); return; }
    if (!confirm(`ลบกลิ่น "${p.name}" ถาวร?\nจะลบบาร์โค้ด + สต๊อกสำเร็จรูป + วัตถุดิบของกลิ่นนี้ทั้งหมด (ประวัติใบเบิกไม่กระทบ)`)) return;
    const res = await deleteProduct(p.id); if (!res.ok) { alert(res.error); return; } router.refresh();
  }
  function openAdd(id: number) { setAddId(id); setASize(""); setABarcode(""); setASku(""); }
  async function saveBarcode(scent: string) {
    const res = await addScentBarcode(scent, aSize, aBarcode, aSku);
    if (!res.ok) {
      // บาร์โค้ดถูกใช้กับกลิ่นอื่น → ถามว่าจะย้ายมาที่นี่ไหม
      if (res.conflict && window.confirm(`${res.error}\n\nต้องการย้ายบาร์โค้ดนี้จาก "${res.conflict.scent}" ${res.conflict.size} มาที่ "${scent}" ${aSize} แทนไหม?`)) {
        const move = await addScentBarcode(scent, aSize, aBarcode, aSku, true);
        if (!move.ok) { alert(move.error); return; }
        setAddId(null); router.refresh();
        return;
      }
      alert(res.error); return;
    }
    setAddId(null); router.refresh();
  }
  async function delBarcode(id: number) {
    if (!confirm("ลบบาร์โค้ดนี้?")) return;
    const res = await deleteScentBarcode(id); if (!res.ok) { alert(res.error); return; } router.refresh();
  }
  async function toggleDisc(name: string, size: string, disc: boolean) {
    const res = await setDiscontinued(name, size, disc); if (!res.ok) { alert(res.error); return; } router.refresh();
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
          <select className="input w-36" value={ptype} onChange={(e) => setPtype(e.target.value)}>
            <option value="">Grade…</option>
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
        <span className={`chip ${(counts[""] ?? 0) > 0 ? "bg-amber-50 text-amber-700" : "bg-soft text-muted"}`}>ยังไม่ระบุ Grade {counts[""] ?? 0}</span>
        {discCount > 0 && <span className="chip bg-red-50 text-red-600">เลิกผลิต {discCount}</span>}
      </div>

      {/* toolbar: ค้นหา + ฟิลเตอร์ + ตั้งประเภทหลายแถว */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหากลิ่น" />
          </div>
          <div className="flex overflow-hidden rounded-lg border border-line text-sm">
            {(["all", "untyped", "typed", "discontinued"] as Filter[]).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={`px-3 py-2 ${filter === f ? "bg-brand text-white" : "bg-white text-muted hover:bg-soft"}`}>
                {f === "all" ? "ทั้งหมด" : f === "untyped" ? "ยังไม่ระบุ Grade" : f === "typed" ? "ระบุแล้ว" : "ยกเลิกการผลิต"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">ตั้ง Grade {filtered.length} แถวที่กรอง →</span>
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
              <th className="px-4 py-3 whitespace-nowrap">ชื่อกลิ่น</th>
              <th className="px-3 py-3">Grade</th>
              <th className="px-3 py-3">ขนาด + บาร์โค้ด (CTW)</th>
              <th className="px-3 py-3 text-center">ใช้</th>
              <th className="px-3 py-3 text-center">สถานะ</th>
              <th className="px-3 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">ไม่พบกลิ่น</td></tr>}
            {filtered.map((p) => {
              const barcodes = sizesFor(p.name);
              return (
                <Fragment key={p.id}>
                  <tr id={`prod-${p.id}`} className={`border-t border-line ${!p.active ? "bg-soft/40" : ""} ${addId === p.id ? "bg-brand-50/40" : ""}`}>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap">
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
                    <td className="px-3 py-2.5 align-top">
                      <select value={p.ptype ?? ""} onChange={(e) => changeType(p.id, e.target.value)} className="input h-8 w-28 py-0 text-xs" title="Grade น้ำหอม">
                        <option value="">—</option>
                        {PERFUME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        {p.ptype && !(PERFUME_TYPES as readonly string[]).includes(p.ptype) && <option value={p.ptype}>{p.ptype}</option>}
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {barcodes.length === 0 && addId !== p.id && discSizes(p.name).length === 0 && (
                          <span className="text-xs text-faint">— ยังไม่มีบาร์โค้ด</span>
                        )}
                        {barcodes.map((s) => {
                          const disc = isDisc(p.name, s.size);
                          return (
                            <div key={s.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 ${disc ? "border-red-200 bg-red-50/60" : "border-line bg-white"}`}>
                              <span className={`text-xs font-semibold ${disc ? "text-red-600 line-through" : "text-ink"}`}>{s.size.replace(/\.$/, "")}</span>
                              <span className="font-mono text-xs text-muted">{s.barcode}</span>
                              {s.sku && <span className="text-[11px] text-faint">{s.sku}</span>}
                              <button onClick={() => toggleDisc(p.name, s.size, !disc)} title={disc ? "ยกเลิก 'เลิกผลิต'" : "ทำเครื่องหมายเลิกผลิต"}
                                className={disc ? "text-red-600" : "text-faint hover:text-red-500"}><Ban size={12} /></button>
                              <button onClick={() => delBarcode(s.id)} className="text-faint hover:text-red-500" title="ลบบาร์โค้ดนี้"><X size={12} /></button>
                            </div>
                          );
                        })}
                        {discSizes(p.name).filter((dk) => !barcodes.some((s) => normKey(s.size) === dk)).map((dk) => (
                          <span key={"d" + dk} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-1 text-xs font-medium text-red-600">
                            <span className="line-through">{dk.replace(/ml$/, " ml")}</span> เลิกผลิต
                            <button onClick={() => toggleDisc(p.name, dk.replace(/ml$/, " ml"), false)} title="ยกเลิก 'เลิกผลิต'" className="hover:text-red-800"><X size={11} /></button>
                          </span>
                        ))}
                        {sizes.filter((sz) => !isDisc(p.name, sz)).length > 0 && (
                          <select value="" onChange={(e) => { if (e.target.value) toggleDisc(p.name, e.target.value, true); }}
                            className="h-7 rounded-md border border-line bg-white px-1.5 text-xs text-muted" title="ทำเครื่องหมายเลิกผลิตขนาด">
                            <option value="">⊘ เลิกผลิตขนาด…</option>
                            {sizes.filter((sz) => !isDisc(p.name, sz)).map((sz) => <option key={sz} value={sz}>{sz}</option>)}
                          </select>
                        )}
                        {addId === p.id ? (
                          <div className="flex items-center gap-1 rounded-lg border border-brand/40 bg-brand-50/40 px-1.5 py-1">
                            <input autoFocus className="input h-7 w-16 py-0 text-xs" value={aSize} onChange={(e) => setASize(e.target.value)} placeholder="ขนาด" />
                            <input className="input h-7 w-36 py-0 font-mono text-xs" value={aBarcode} onChange={(e) => setABarcode(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveBarcode(p.name); if (e.key === "Escape") setAddId(null); }} placeholder="บาร์โค้ด" />
                            <input className="input h-7 w-24 py-0 text-xs" value={aSku} onChange={(e) => setASku(e.target.value)} placeholder="SKU (ถ้ามี)" />
                            <button onClick={() => saveBarcode(p.name)} className="rounded-md p-1 text-green-600 hover:bg-green-50" title="บันทึก"><Check size={15} /></button>
                            <button onClick={() => setAddId(null)} className="rounded-md p-1 text-muted hover:bg-soft" title="ยกเลิก"><X size={15} /></button>
                          </div>
                        ) : (
                          <button onClick={() => openAdd(p.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-brand-600 hover:bg-brand-50">
                            <Plus size={12} /> เพิ่มบาร์โค้ด
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center align-top text-muted">{p.used > 0 ? p.used.toLocaleString() : "—"}</td>
                    <td className="px-3 py-2.5 text-center align-top">
                      <span className={`chip ${p.active ? "bg-green-50 text-green-700" : "bg-soft text-muted"}`}>{p.active ? "ใช้งาน" : "ปิด"}</span>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex items-center justify-end gap-1">
                        {editId !== p.id && (
                          <button onClick={() => { setEditId(p.id); setEditVal(p.name); }} className="rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink" title="แก้ชื่อ"><Pencil size={15} /></button>
                        )}
                        <button onClick={() => toggle(p)} className="rounded-md px-2 py-1 text-xs text-muted hover:bg-soft">{p.active ? "ปิด" : "เปิด"}</button>
                        {isAdmin && (
                          <button onClick={() => del(p)}
                            className={`rounded-md p-1.5 ${p.used > 0 ? "text-faint hover:bg-soft" : "text-red-400 hover:bg-red-50 hover:text-red-600"}`}
                            title={p.used > 0 ? "ลบไม่ได้ (มีในใบเบิก) — ปิดแทน" : "ลบกลิ่นถาวร (แอดมิน)"}><Trash2 size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-faint">แก้ชื่อมีผลกับใบใหม่ (ใบเก่ายังเป็นชื่อเดิม) · ขนาด + บาร์โค้ด ดึงจาก master ของร้าน CTW (เฉพาะกลิ่นที่ชื่อตรงกัน) · ใช้งาน {activeCount} · ทั้งหมด {products.length}</p>
    </div>
  );
}
