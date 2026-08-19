"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createProduct, setProductActive, setProductType, bulkSetProductTypes, addScentBarcode, deleteScentBarcode, setDiscontinued, deleteProduct } from "@/lib/actions/products";
import type { ProductAdminRow, ScentBarcode } from "@/lib/queries";
import { PERFUME_TYPES } from "@/lib/types";
import { Plus, Check, X, Search, CheckCircle2, Ban, Trash2, ChevronDown, ChevronRight, ArrowLeftRight } from "lucide-react";

type Filter = "all" | "untyped" | "discontinued";
const normKey = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
const GRADE_ORDER = ["EDP", "EDP+", "PARFUM", "EDT"];   // ลำดับแสดง (เหมือนหน้าสต๊อก) — ต่างจาก PERFUME_TYPES
const grank = (g: string) => { const i = GRADE_ORDER.indexOf(g); return i < 0 ? 90 : i; };
const sizeMl = (s: string) => { const m = (s || "").match(/[\d.]+/); return m ? parseFloat(m[0]) : 9999; };   // เรียงขนาดน้อย→มาก

export default function ProductsManager({
  products, sizesByScent = {}, discontinued = {}, sizes = [], fdaKeys = [], isAdmin = false,
}: {
  products: ProductAdminRow[];
  sizesByScent?: Record<string, ScentBarcode[]>;
  discontinued?: Record<string, string[]>;
  sizes?: string[];
  fdaKeys?: string[];         // ชื่อกลิ่น (normalize) ที่มีทะเบียน อย.
  isAdmin?: boolean;
}) {
  const fdaSet = useMemo(() => new Set(fdaKeys), [fdaKeys]);
  const hasFdaData = fdaKeys.length > 0;                                   // มีข้อมูล อย. ให้เทียบไหม
  const noFda = (n: string) => hasFdaData && !fdaSet.has(normKey(n));      // กลิ่นนี้ยังไม่มีใน อย.
  const router = useRouter();
  const [name, setName] = useState("");
  const [ptype, setPtype] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [bulkType, setBulkType] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());   // กลุ่มเกรดที่พับ (default กาง)
  const [moveId, setMoveId] = useState<number | null>(null);            // เปิด dropdown "ย้ายเกรด" ของแถวไหน (ในกลุ่มเกรด)
  // เพิ่มบาร์โค้ดเองต่อกลิ่น
  const [addId, setAddId] = useState<number | null>(null);
  const [aSize, setASize] = useState("");
  const [aBarcode, setABarcode] = useState("");
  const [aSku, setASku] = useState("");

  const sizesFor = (n: string) => sizesByScent[normKey(n)] ?? [];
  const discSizes = (n: string) => discontinued[normKey(n)] ?? [];
  const isDisc = (n: string, size: string) => discSizes(n).includes(normKey(size));

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === "untyped" && p.ptype) return false;
      if (filter === "discontinued" && discSizes(p.name).length === 0) return false;
      if (t && !p.name.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [products, q, filter, discontinued]);

  // จัดกลุ่มตามเกรด — "ยังไม่ระบุ" (คีย์ "") ขึ้นบนสุด แล้ว EDP → EDP+ → PARFUM → EDT → อื่นๆ
  const groups = useMemo(() => {
    const m = new Map<string, ProductAdminRow[]>();
    for (const p of filtered) {
      const k = p.ptype || "";
      (m.get(k) ?? m.set(k, []).get(k)!).push(p);
    }
    // ลำดับในกลุ่ม: ใช้งานปกติ(0) → ใช้งานแต่เลิกผลิตบางขนาด(1) → ปิด(2 ล่างสุด)
    const rank = (p: ProductAdminRow) => !p.active ? 2 : (discSizes(p.name).length > 0 ? 1 : 0);
    return [...m.entries()]
      .sort((a, b) => (a[0] === "" ? -1 : b[0] === "" ? 1 : grank(a[0]) - grank(b[0]) || a[0].localeCompare(b[0])))
      .map(([grade, rows]) => ({ grade, rows: rows.sort((x, y) => rank(x) - rank(y) || x.name.localeCompare(y.name, "en")) }));
  }, [filtered, discontinued]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { "": 0 };
    PERFUME_TYPES.forEach((t) => (c[t] = 0));
    products.forEach((p) => { const v = p.ptype ?? ""; c[v] = (c[v] ?? 0) + 1; });
    return c;
  }, [products]);
  const discCount = useMemo(() => products.filter((p) => discSizes(p.name).length > 0).length, [products, discontinued]);
  const noFdaCount = useMemo(() => products.filter((p) => noFda(p.name)).length, [products, fdaSet, hasFdaData]);
  const activeCount = products.filter((p) => p.active).length;

  // ทางลัด "เพิ่มบาร์โค้ด" จากหน้าสต๊อก (/products?scent=..&size=..)
  const sp = useSearchParams();
  useEffect(() => {
    const scent = sp.get("scent"); if (!scent) return;
    const p = products.find((x) => normKey(x.name) === normKey(scent));
    if (!p) return;
    setQ(scent); setAddId(p.id); setASize(sp.get("size") || ""); setABarcode(""); setASku("");
    setTimeout(() => document.getElementById(`prod-${p.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── actions (เหมือนเดิม) ──
  async function add(e: React.FormEvent) {
    e.preventDefault(); setError(""); setMsg(""); setBusy(true);
    const nm = name.trim();
    const res = await createProduct(name, "", ptype); setBusy(false);
    if (!res.ok) { setError(res.error || "เพิ่มไม่สำเร็จ"); return; }
    setMsg(`เพิ่มกลิ่น "${nm}" แล้ว${noFda(nm) ? " · ⚠ ยังไม่มีในทะเบียน อย. (ควรจดแจ้ง/ตรวจชื่อให้ตรง)" : ""}`);
    setName(""); setPtype(""); router.refresh();
  }
  async function changeType(id: number, v: string) { const res = await setProductType(id, v); if (!res.ok) { alert(res.error); return; } setMoveId(null); router.refresh(); }
  async function toggle(p: ProductAdminRow) { const res = await setProductActive(p.id, !p.active); if (!res.ok) { alert(res.error); return; } router.refresh(); }
  async function del(p: ProductAdminRow) {
    if (p.used > 0) { alert(`กลิ่นนี้มีในใบเบิก ${p.used.toLocaleString()} รายการ — ปิดการใช้งานแทน (ลบไม่ได้ กันประวัติเสีย)`); return; }
    if (!confirm(`ลบกลิ่น "${p.name}" ถาวร?\nจะลบบาร์โค้ด + สต๊อกสำเร็จรูป + วัตถุดิบของกลิ่นนี้ทั้งหมด (ประวัติใบเบิกไม่กระทบ)`)) return;
    const res = await deleteProduct(p.id); if (!res.ok) { alert(res.error); return; } router.refresh();
  }
  function openAdd(id: number) { setAddId(id); setASize(""); setABarcode(""); setASku(""); }
  async function saveBarcode(scent: string) {
    const res = await addScentBarcode(scent, aSize, aBarcode, aSku);
    if (!res.ok) {
      if (res.conflict && window.confirm(`${res.error}\n\nต้องการย้ายบาร์โค้ดนี้จาก "${res.conflict.scent}" ${res.conflict.size} มาที่ "${scent}" ${aSize} แทนไหม?`)) {
        const move = await addScentBarcode(scent, aSize, aBarcode, aSku, true);
        if (!move.ok) { alert(move.error); return; }
        setAddId(null); router.refresh(); return;
      }
      alert(res.error); return;
    }
    setAddId(null); router.refresh();
  }
  async function delBarcode(id: number) { if (!confirm("ลบบาร์โค้ดนี้?")) return; const res = await deleteScentBarcode(id); if (!res.ok) { alert(res.error); return; } router.refresh(); }
  async function toggleDisc(name: string, size: string, disc: boolean) { const res = await setDiscontinued(name, size, disc); if (!res.ok) { alert(res.error); return; } router.refresh(); }
  async function applyBulk() {
    const rows = filtered; if (rows.length === 0) return;
    if (!confirm(`ตั้งเกรด "${bulkType || "— (ล้าง)"}" ให้ ${rows.length} กลิ่นที่กรองอยู่?`)) return;
    setBusy(true); setMsg(""); setError("");
    const res = await bulkSetProductTypes(rows.map((p) => ({ id: p.id, ptype: bulkType }))); setBusy(false);
    if (!res.ok) { setError(res.error || "บันทึกไม่สำเร็จ"); return; }
    setMsg(`ตั้งเกรด ${res.count} กลิ่นแล้ว`); router.refresh();
  }

  const toggleGrp = (k: string) => setCollapsed((c) => { const n = new Set(c); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div className="space-y-4">
      {/* เพิ่มกลิ่นใหม่ */}
      <form onSubmit={add} className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Plus size={16} /> เพิ่มกลิ่นใหม่</h2>
        <div className="flex flex-wrap gap-2">
          <input className="input min-w-[220px] flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อกลิ่น เช่น Volt - Twilight (EDT)" />
          <select className="input w-36" value={ptype} onChange={(e) => setPtype(e.target.value)}>
            <option value="">Grade…</option>
            {PERFUME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn-primary" disabled={busy}>{busy ? "กำลังเพิ่ม…" : "เพิ่มกลิ่น"}</button>
        </div>
        {error && <div className="alert-error mt-2">{error}</div>}
        {msg && <div className="alert-success mt-2 flex items-center gap-1"><CheckCircle2 size={14} /> {msg}</div>}
      </form>

      {/* toolbar: ค้นหา + ฟิลเตอร์ + ย่อ/ขยาย */}
      <div className="card flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="relative min-w-[180px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหากลิ่น" />
        </div>
        <div className="flex overflow-hidden rounded-lg border border-line text-sm">
          {(["all", "untyped", "discontinued"] as Filter[]).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`px-3 py-2 ${filter === f ? "bg-brand text-white" : "bg-white text-muted hover:bg-soft"}`}>
              {f === "all" ? "ทั้งหมด" : f === "untyped" ? "ยังไม่ระบุ" : "เลิกผลิต"}
            </button>
          ))}
        </div>
        <button onClick={() => setCollapsed(new Set(groups.map((g) => g.grade)))} className="btn-ghost text-xs"><ChevronRight size={14} /> ย่อ</button>
        <button onClick={() => setCollapsed(new Set())} className="btn-ghost text-xs"><ChevronDown size={14} /> ขยาย</button>
      </div>

      {/* สรุปเกรด + ตั้งเกรดหลายกลิ่น */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip-muted">ทั้งหมด {products.length}</span>
        {GRADE_ORDER.map((t) => <span key={t} className="chip-brand">{t} {counts[t] ?? 0}</span>)}
        <span className={counts[""] > 0 ? "chip-warn" : "chip-muted"}>ยังไม่ระบุ {counts[""] ?? 0}</span>
        {discCount > 0 && <span className="chip-danger">เลิกผลิต {discCount}</span>}
        {noFdaCount > 0 && <span className="chip-warn" title="กลิ่นที่ยังไม่มีในทะเบียน อย.">⚠ ไม่มีใน อย. {noFdaCount}</span>}
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted">
          ตั้งเกรด {filtered.length} ที่กรอง →
          <select className="input h-8 w-24 py-0 text-xs" value={bulkType} onChange={(e) => setBulkType(e.target.value)}>
            <option value="">— (ล้าง)</option>
            {PERFUME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button type="button" onClick={applyBulk} className="btn-ghost text-xs" disabled={busy || filtered.length === 0}>ใช้</button>
        </span>
      </div>

      {/* กลุ่มตามเกรด — พับ/กางได้ (แนวเดียวกับหน้าสต๊อก) */}
      <div className="space-y-3">
        {groups.length === 0 && <p className="card p-10 text-center text-sm text-muted">ไม่พบกลิ่น</p>}
        {groups.map((grp) => {
          const untyped = grp.grade === "";
          const open = !collapsed.has(grp.grade);
          const discN = grp.rows.filter((p) => discSizes(p.name).length > 0).length;
          return (
            <div key={grp.grade || "__untyped__"} className="overflow-hidden rounded-xl border border-line bg-white">
              <button onClick={() => toggleGrp(grp.grade)} className={`flex w-full items-center gap-2 px-4 py-2.5 text-left ${untyped ? "bg-amber-50" : "bg-soft/60"}`}>
                {open ? <ChevronDown size={15} className="text-faint" /> : <ChevronRight size={15} className="text-faint" />}
                <span className={`font-semibold ${untyped ? "text-amber-700" : "text-ink"}`}>{untyped ? "⚠ ยังไม่ระบุ Grade" : grp.grade}</span>
                <span className="text-xs text-muted">· {grp.rows.length} กลิ่น{untyped ? " · ตั้งเกรดให้ครบเพื่อให้สต๊อก/ป้ายทำงาน" : discN > 0 ? <span className="text-red-600"> · เลิกผลิต {discN}</span> : ""}</span>
              </button>
              {open && (
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {grp.rows.map((p) => {
                    const barcodes = sizesFor(p.name).slice().sort((a, b) => sizeMl(a.size) - sizeMl(b.size));
                    return (
                      <div key={p.id} id={`prod-${p.id}`} className={`border-t border-line px-4 py-3 lg:odd:border-r ${!p.active ? "bg-soft/40" : ""} ${addId === p.id ? "bg-brand-50/40" : ""}`}>
                        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                          {/* ชื่อกลิ่น (อ่านอย่างเดียว) + เตือนถ้าไม่มีใน อย. */}
                          <span className="flex min-w-[150px] flex-wrap items-center gap-1.5">
                            <span className={p.active ? "font-medium text-ink" : "text-muted line-through"}>{p.name}</span>
                            {noFda(p.name) && <span className="chip-warn" title="ยังไม่มีในทะเบียน อย. — ควรจดแจ้ง/ตรวจชื่อให้ตรง">⚠ ไม่มีใน อย.</span>}
                          </span>

                          {/* เกรด — กลุ่มยังไม่ระบุ: dropdown เด่นเสมอ · กลุ่มเกรด: โชว์เฉพาะตอนกด "ย้ายเกรด" (เกรดบอกด้วยกลุ่มอยู่แล้ว) */}
                          {(untyped || moveId === p.id) && (
                            <select value={p.ptype ?? ""} onChange={(e) => changeType(p.id, e.target.value)} title="เกรดน้ำหอม (เปลี่ยนแล้วย้ายกลุ่ม)" autoFocus={moveId === p.id}
                              className={untyped ? "input h-8 w-32 border-amber-400 py-0 text-xs font-semibold text-amber-700" : "input h-8 w-24 py-0 text-xs"}>
                              <option value="">{untyped ? "เลือกเกรด…" : "— (ล้างเกรด)"}</option>
                              {PERFUME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                              {p.ptype && !(PERFUME_TYPES as readonly string[]).includes(p.ptype) && <option value={p.ptype}>{p.ptype}</option>}
                            </select>
                          )}

                          {/* บาร์โค้ดต่อขนาด — เรียงแนวตั้ง (บน→ล่าง ตามขนาด) */}
                          <div className="flex flex-col items-start gap-1">
                            {barcodes.length === 0 && addId !== p.id && discSizes(p.name).length === 0 && <span className="text-xs text-faint">— ยังไม่มีบาร์โค้ด</span>}
                            {barcodes.map((s) => {
                              const disc = isDisc(p.name, s.size);
                              return (
                                <div key={s.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 ${disc ? "border-red-200 bg-red-50/60" : "border-line bg-white"}`}>
                                  <span className={`text-xs font-semibold ${disc ? "text-red-600 line-through" : "text-ink"}`}>{s.size.replace(/\.$/, "")}</span>
                                  <span className="font-mono text-xs text-muted">{s.barcode}</span>
                                  {s.sku && <span className="text-[11px] text-faint">{s.sku}</span>}
                                  <button onClick={() => toggleDisc(p.name, s.size, !disc)} title={disc ? "ยกเลิก 'เลิกผลิต'" : "ทำเครื่องหมายเลิกผลิต"} className={disc ? "text-red-600" : "text-faint hover:text-red-500"}><Ban size={12} /></button>
                                  <button onClick={() => delBarcode(s.id)} className="text-faint hover:text-red-500" title="ลบบาร์โค้ดนี้"><X size={12} /></button>
                                </div>
                              );
                            })}
                            {discSizes(p.name).filter((dk) => !barcodes.some((s) => normKey(s.size) === dk)).sort((a, b) => sizeMl(a) - sizeMl(b)).map((dk) => (
                              <span key={"d" + dk} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-1 text-xs font-medium text-red-600">
                                <span className="line-through">{dk.replace(/ml$/, " ml")}</span> เลิกผลิต
                                <button onClick={() => toggleDisc(p.name, dk.replace(/ml$/, " ml"), false)} title="ยกเลิก 'เลิกผลิต'" className="hover:text-red-800"><X size={11} /></button>
                              </span>
                            ))}
                            {sizes.filter((sz) => !isDisc(p.name, sz)).length > 0 && (
                              <select value="" onChange={(e) => { if (e.target.value) toggleDisc(p.name, e.target.value, true); }} className="h-7 rounded-md border border-line bg-white px-1.5 text-xs text-muted" title="ทำเครื่องหมายเลิกผลิตขนาด">
                                <option value="">⊘ เลิกผลิต…</option>
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
                              <button onClick={() => openAdd(p.id)} className="inline-flex items-center gap-1 rounded-md border border-dashed border-brand/40 px-2 py-1 text-xs text-brand-600 hover:bg-brand-50"><Plus size={12} /> บาร์โค้ด</button>
                            )}
                          </div>

                          {/* ใช้ในใบเบิก + สถานะ + จัดการ (ดันไปขวา) */}
                          <span className="ml-auto whitespace-nowrap text-xs text-faint" title="จำนวนบรรทัดในใบเบิกที่ใช้กลิ่นนี้ (ลบไม่ได้ถ้า >0)">{p.used > 0 ? `ในใบเบิก ${p.used.toLocaleString()}` : "—"}</span>
                          <span className={p.active ? "chip-ok" : "chip-muted"}>{p.active ? "ใช้งาน" : "ปิด"}</span>
                          <div className="flex items-center gap-1">
                            {!untyped && (
                              <button onClick={() => setMoveId(moveId === p.id ? null : p.id)} className={`rounded-md p-1.5 ${moveId === p.id ? "bg-amber-50 text-amber-700" : "text-faint hover:bg-soft hover:text-ink"}`} title="ย้ายเกรด"><ArrowLeftRight size={14} /></button>
                            )}
                            <button onClick={() => toggle(p)} className="rounded-md px-2 py-1 text-xs text-muted hover:bg-soft" title={p.active ? "ปิดการใช้งาน" : "เปิดใช้งาน"}>{p.active ? "ปิด" : "เปิด"}</button>
                            {isAdmin && (
                              <button onClick={() => del(p)} className={`rounded-md p-1.5 ${p.used > 0 ? "text-faint hover:bg-soft" : "text-red-400 hover:bg-red-50 hover:text-red-600"}`}
                                title={p.used > 0 ? "ลบไม่ได้ (มีในใบเบิก) — ปิดแทน" : "ลบกลิ่นถาวร (แอดมิน)"}><Trash2 size={15} /></button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-faint">เปลี่ยนเกรดแล้วกลิ่นย้ายกลุ่ม · ขนาด+บาร์โค้ดดึงจาก master CTW (เฉพาะกลิ่นชื่อตรง) · ใช้งาน {activeCount} · ทั้งหมด {products.length}</p>
    </div>
  );
}
