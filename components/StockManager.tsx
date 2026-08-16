"use client";
import { Fragment, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Combobox from "./Combobox";
import { receiveStock, receiveUnits, adjustStock, resolveSku } from "@/lib/actions/stock";
import type { StockRow } from "@/lib/queries";
import { PERFUME_TYPES } from "@/lib/types";
import { PackagePlus, CheckCircle2, Search, History, FileUp, FileDown, Lock, Check, RotateCcw, ClipboardCheck, ChevronDown, ChevronRight, Printer, ScanBarcode, X } from "lucide-react";

type Status = "all" | "normal" | "low" | "out" | "neg";
const keyOf = (r: StockRow) => `${r.product}|${r.size}`;

function statusOf(qty: number) {
  if (qty < 0) return { label: "ติดลบ", cls: "bg-red-100 text-red-700", dot: "bg-red-500" };
  if (qty === 0) return { label: "หมด", cls: "bg-red-50 text-red-600", dot: "bg-red-400" };
  if (qty <= 10) return { label: "ใกล้หมด", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" };
  return { label: "ปกติ", cls: "bg-green-50 text-green-700", dot: "bg-green-500" };
}

export default function StockManager({ rows, products, sizes, initialLow, isAdmin, discontinued = {}, skuMap = {} }:
  { rows: StockRow[]; products: string[]; sizes: string[]; initialLow?: boolean; isAdmin: boolean; discontinued?: Record<string, string[]>; skuMap?: Record<string, string> }) {
  const router = useRouter();
  const normKey = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
  const isDisc = (product: string, size: string) => (discontinued[normKey(product)] ?? []).includes(normKey(size));
  const skuOf = (product: string, size: string) => skuMap[`${normKey(product)}|${normKey(size)}`] ?? "";

  // ---- filters ----
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");        // "" = ทั้งหมด, "__none__" = ไม่ระบุ
  const [size, setSize] = useState("");
  const [status, setStatus] = useState<Status>(initialLow ? "low" : "all");

  const gradesInUse = useMemo(() => PERFUME_TYPES.filter((g) => rows.some((r) => r.grade === g)), [rows]);
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (t && !r.product.toLowerCase().includes(t)) return false;
      if (grade === "__none__" ? !!r.grade : grade && r.grade !== grade) return false;
      if (size && r.size !== size) return false;
      if (status === "normal" && !(r.qty > 10)) return false;
      if (status === "low" && !(r.qty >= 0 && r.qty <= 10)) return false;
      if (status === "out" && r.qty !== 0) return false;
      if (status === "neg" && !(r.qty < 0)) return false;
      return true;
    });
  }, [rows, search, grade, size, status]);
  const hasFilter = !!(search || grade || size || status !== "all");
  // เรียง: เกรดน้ำหอม (A-Z) ก่อน → หมวดอื่น เช่น Car Perfume (A-Z) → ไม่ระบุ ท้ายสุด; ในกลุ่ม: ชื่อ A-Z → ขนาดใหญ่→เล็ก
  const mlOf = (s: string) => { const m = String(s || "").match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
  const gradeBucket = (g: string | null) => !g ? 2 : (PERFUME_TYPES as readonly string[]).includes(g) ? 0 : 1;
  const DISC_GROUP = "เลิกผลิต";
  const sorted = useMemo(() => [...filtered].sort((a, b) =>
    (isDisc(a.product, a.size) ? 1 : 0) - (isDisc(b.product, b.size) ? 1 : 0)   // เลิกผลิต → กลุ่มล่างสุด
    || gradeBucket(a.grade) - gradeBucket(b.grade)
    || (a.grade || "zzz").localeCompare(b.grade || "zzz", "en")
    || a.product.localeCompare(b.product, "en")
    || mlOf(b.size) - mlOf(a.size)
  ), [filtered, discontinued]);
  // จัดกลุ่มตาม Grade (เลิกผลิตแยกกลุ่มล่างสุด) + สรุป
  const groups = useMemo(() => {
    const m = new Map<string, StockRow[]>();
    for (const r of sorted) { const g = isDisc(r.product, r.size) ? DISC_GROUP : (r.grade || "ไม่ระบุ Grade"); if (!m.has(g)) m.set(g, []); m.get(g)!.push(r); }
    return [...m.entries()].map(([g, rs]) => ({
      grade: g, rows: rs,
      total: rs.reduce((s, r) => s + r.qty, 0),
      low: rs.filter((r) => r.qty <= 10).length,
    }));
  }, [sorted]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (g: string) => setCollapsed((s) => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n; });

  function exportCsv() {
    const header = ["Grade", "สินค้า", "ขนาด", "SKU", "คงเหลือ", "สถานะ", "เลิกผลิต"];
    const lines = sorted.map((r) => [r.grade || "", r.product, r.size, skuOf(r.product, r.size), r.qty, statusOf(r.qty).label, isDisc(r.product, r.size) ? "เลิกผลิต" : ""]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    const csv = "﻿" + [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `stock-filtered-${sorted.length}.csv`; a.click();
    URL.revokeObjectURL(url);
  }
  function clearFilters() { setSearch(""); setGrade(""); setSize(""); setStatus("all"); }

  // ---- stocktake (ปรับยอดนับได้จริง) ----
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  async function saveCount(r: StockRow) {
    const k = keyOf(r);
    const v = counted[k];
    if (v === undefined || v === "" || Number(v) === r.qty) return;
    setSavingKey(k);
    const res = await adjustStock(r.product, r.size, Number(v));
    setSavingKey(null);
    if (!res.ok) { alert(res.error); return; }
    setCounted((c) => { const n = { ...c }; delete n[k]; return n; });
    router.refresh();
  }
  async function quickReceive(r: StockRow) {
    const v = prompt(`รับเข้า ${r.product} ${r.size} — จำนวน?`);
    if (!v) return;
    const res = await receiveStock(r.product, r.size, Number(v));
    if (!res.ok) { alert(res.error); return; }
    router.refresh();
  }

  // ---- รับเข้า / นำเข้าไฟล์ (admin) ----
  const [f, setF] = useState({ barcode: "", product: "", size: "", grade: "", note: "" });
  const [skuList, setSkuList] = useState<string[]>([]);   // SKU รายชิ้นที่ user สแกน/ใส่เอง
  const [skuInput, setSkuInput] = useState("");
  const skuRef = useRef<HTMLInputElement>(null);
  async function doResolveBarcode() {
    if (!f.barcode.trim()) return;
    setErr(""); setMsg("");
    const res = await resolveSku(f.barcode);   // resolve จากบาร์โค้ดสินค้า (EAN) → กลิ่น+ขนาด
    if (!res.ok) { setErr(res.error || "ไม่พบบาร์โค้ด"); return; }
    setF((s) => ({ ...s, product: res.product!, size: res.size!, grade: res.grade || "" }));
    setTimeout(() => skuRef.current?.focus(), 0);
  }
  function addSku(v: string) {
    const s = v.trim(); if (!s) return;
    setSkuList((l) => (l.includes(s) ? l : [...l, s]));
    setSkuInput("");
  }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  async function importFile(file: File) {
    setErr(""); setMsg(""); setBusy(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch("/api/stock/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) setErr(data.error || "นำเข้าไม่สำเร็จ");
      else { setMsg(`นำเข้าสต๊อกจากไฟล์ ${data.imported} รายการ (${(data.sheets || []).join(", ")})`); router.refresh(); }
    } catch { setErr("อัปโหลดไม่สำเร็จ"); }
    setBusy(false);
  }
  const [lastSkus, setLastSkus] = useState<string[]>([]);
  async function receive(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg(""); setBusy(true);
    const all = skuInput.trim() ? [...skuList, skuInput.trim()] : skuList;   // เผื่อยังพิมพ์ค้างในช่อง
    const res = await receiveUnits(f.product, f.size, all, f.barcode);
    setBusy(false);
    if (!res.ok) { setErr(res.error || "รับเข้าไม่สำเร็จ"); return; }
    const dup = res.dupes?.length ? ` · ข้ามซ้ำ ${res.dupes.length}` : "";
    setMsg(`รับเข้า ${f.product} ${f.size} +${res.added} ชิ้น → คงเหลือ ${res.balance}${dup}`);
    setLastSkus((res.skus || []).filter((s) => !(res.dupes || []).includes(s)));
    setF({ barcode: "", product: "", size: "", grade: "", note: "" }); setSkuList([]); setSkuInput(""); router.refresh();
  }

  return (
    <div className="space-y-4">
      {!isAdmin && (
        <div className="card flex items-center gap-2 p-4 text-sm text-muted">
          <Lock size={16} className="text-faint" /> โหมดดูอย่างเดียว — ปรับสต๊อก/รับเข้า/นำเข้าไฟล์ ทำได้เฉพาะผู้ดูแลระบบ (admin)
        </div>
      )}

      {/* รับเข้า + นำเข้าไฟล์ (admin) */}
      {isAdmin && (
        <form onSubmit={receive} className="card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><PackagePlus size={16} /> รับสินค้าเข้าสต๊อก</h2>
            <div className="flex gap-2">
              <a href="/api/stock/template" className="btn-ghost text-xs"><FileDown size={14} /> เทมเพลต</a>
              <button type="button" className="btn-ghost text-xs" disabled={busy} onClick={() => fileRef.current?.click()}>
                <FileUp size={14} /> {busy ? "กำลังนำเข้า…" : "นำเข้าไฟล์ Excel"}
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) importFile(file); }} />
            </div>
          </div>
          {/* 1) สแกนบาร์โค้ดสินค้า (EAN) → เดากลิ่น+ขนาด */}
          <div className="mb-2 flex flex-wrap gap-2">
            <input value={f.barcode} onChange={(e) => setF((s) => ({ ...s, barcode: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doResolveBarcode(); } }}
              className="input flex-1 min-w-[220px] font-mono" placeholder="สแกนบาร์โค้ดสินค้า (EAN) → เดากลิ่น/ขนาด" />
            <button type="button" onClick={doResolveBarcode} className="btn-ghost"><Search size={15} /> ค้นหา</button>
          </div>
          {/* 2) กลิ่น/ขนาด (เลือกเองได้) */}
          <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_160px_1fr]">
            <Combobox value={f.product} onChange={(v) => setF((s) => ({ ...s, product: v }))} options={products} placeholder="เลือกกลิ่น" />
            <Combobox value={f.size} onChange={(v) => setF((s) => ({ ...s, size: v }))} options={sizes} placeholder="ขนาด" />
            <input className="input" value={f.note} onChange={(e) => setF((s) => ({ ...s, note: e.target.value }))} placeholder="หมายเหตุ (ถ้ามี)" />
          </div>
          {/* 3) สแกน/ใส่ SKU รายชิ้น (user ใส่เอง) */}
          <label className="label flex items-center gap-1"><ScanBarcode size={13} /> สแกน / ใส่ SKU รายชิ้น (กด Enter ทีละชิ้น)</label>
          <div className="flex flex-wrap gap-2">
            <input ref={skuRef} value={skuInput} onChange={(e) => setSkuInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSku(skuInput); } }}
              className="input flex-1 min-w-[220px] font-mono" placeholder="สแกน SKU ของชิ้นสินค้า แล้ว Enter" />
            <button type="submit" className="btn-primary" disabled={busy || (skuList.length === 0 && !skuInput.trim())}>
              {busy ? "…" : `รับเข้า (${skuList.length + (skuInput.trim() ? 1 : 0)} ชิ้น)`}
            </button>
          </div>
          {skuList.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {skuList.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-0.5 font-mono text-xs text-ink">
                  {s}<button type="button" onClick={() => setSkuList((l) => l.filter((x) => x !== s))} className="text-faint hover:text-red-500"><X size={11} /></button>
                </span>
              ))}
              <button type="button" onClick={() => setSkuList([])} className="ml-1 text-xs text-muted hover:text-ink">ล้างทั้งหมด</button>
            </div>
          )}
          {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
          {msg && <p className="mt-3 flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"><CheckCircle2 size={14} /> {msg}</p>}
          {lastSkus.length > 0 && (
            <div className="mt-3 rounded-lg border border-line bg-soft/40 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm font-medium text-ink"><ScanBarcode size={14} /> SKU ที่สร้าง ({lastSkus.length} ชิ้น)</span>
                <a href={`/print/sku-labels?skus=${encodeURIComponent(lastSkus.join(","))}`} target="_blank" rel="noreferrer" className="btn-ghost text-xs"><Printer size={13} /> พิมพ์ป้าย SKU</a>
              </div>
              <div className="flex flex-wrap gap-1 font-mono text-[11px] text-muted">
                {lastSkus.slice(0, 60).map((s) => <span key={s} className="rounded border border-line bg-white px-1.5 py-0.5">{s}</span>)}
                {lastSkus.length > 60 && <span className="px-1">…อีก {lastSkus.length - 60}</span>}
              </div>
            </div>
          )}
        </form>
      )}

      {/* filter bar */}
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="ค้นหากลิ่น" />
        </div>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="input w-32" title="Grade">
          <option value="">Grade: ทั้งหมด</option>
          {gradesInUse.map((g) => <option key={g} value={g}>{g}</option>)}
          <option value="__none__">ไม่ระบุ</option>
        </select>
        <select value={size} onChange={(e) => setSize(e.target.value)} className="input w-28" title="ขนาด">
          <option value="">ขนาด: ทั้งหมด</option>
          {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="input w-32" title="สถานะ">
          <option value="all">สถานะ: ทั้งหมด</option>
          <option value="normal">ปกติ</option>
          <option value="low">ใกล้หมด (≤10)</option>
          <option value="out">หมด (0)</option>
          <option value="neg">ติดลบ</option>
        </select>
        {hasFilter && <button onClick={clearFilters} className="btn-ghost text-xs"><RotateCcw size={14} /> ล้าง</button>}
        <Link href="/stock/moves" className="btn-ghost text-xs"><History size={14} /> ประวัติ</Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted">
        <div className="flex items-center gap-3">
          <span>แสดง <b className="text-ink">{filtered.length.toLocaleString()}</b> จาก {rows.length.toLocaleString()} รายการ</span>
          <button onClick={exportCsv} className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 hover:bg-soft"><FileDown size={12} /> Export ที่กรอง (CSV)</button>
        </div>
        {isAdmin && <span className="flex items-center gap-1"><ClipboardCheck size={13} /> พิมพ์ยอดที่นับได้จริงในช่อง “นับได้จริง” แล้ว Enter เพื่อปรับให้ตรง</span>}
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">สินค้า</th>
                <th className="px-3 py-3">Grade</th>
                <th className="px-3 py-3">ขนาด</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3 text-right">คงเหลือ (ระบบ)</th>
                <th className="px-3 py-3">สถานะ</th>
                {isAdmin && <th className="px-3 py-3 text-right">นับได้จริง / ปรับยอด</th>}
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && <tr><td colSpan={isAdmin ? 7 : 6} className="px-4 py-12 text-center text-muted">ไม่พบสินค้าตามตัวกรอง</td></tr>}
              {groups.map((grp) => {
                const open = !collapsed.has(grp.grade);
                const discGrp = grp.grade === DISC_GROUP;
                return (
                  <Fragment key={grp.grade}>
                    {/* หัวข้อกลุ่ม Grade + สรุป (คลิกพับ/ขยาย) */}
                    <tr className={`border-t border-line ${discGrp ? "bg-red-50" : "bg-soft/70"}`}>
                      <td colSpan={isAdmin ? 7 : 6} className="px-4 py-2">
                        <button onClick={() => toggleGroup(grp.grade)} className={`flex w-full items-center gap-2 text-left text-xs font-semibold ${discGrp ? "text-red-700" : "text-ink"}`}>
                          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span className="uppercase tracking-wide">{discGrp ? "🚫 เลิกผลิต" : grp.grade}</span>
                          <span className={discGrp ? "text-red-600/80" : "text-muted"}>· {grp.rows.length} SKU · รวม {grp.total.toLocaleString()} ชิ้น{!discGrp && grp.low > 0 && <span className="text-amber-600"> · ใกล้หมด {grp.low}</span>}</span>
                        </button>
                      </td>
                    </tr>
                    {open && grp.rows.map((r) => {
                      const st = statusOf(r.qty);
                      const k = keyOf(r);
                      const val = counted[k] ?? String(r.qty);
                      const dirty = counted[k] !== undefined && counted[k] !== "" && Number(counted[k]) !== r.qty;
                      const disc = isDisc(r.product, r.size);
                      return (
                        <tr key={k} className="border-t border-line hover:bg-soft/40">
                          <td className="px-4 py-2.5 font-medium text-ink">
                            {r.product}
                            {disc && <span className="ml-1.5 rounded bg-red-50 px-1 py-0.5 text-[10px] font-medium text-red-600">เลิกผลิต</span>}
                          </td>
                          <td className="px-3 py-2.5">{r.grade ? <span className="chip bg-brand-50 text-brand-600">{r.grade}</span> : <span className="text-faint">—</span>}</td>
                          <td className={`px-3 py-2.5 ${disc ? "text-red-600 line-through" : "text-muted"}`}>{r.size}</td>
                          <td className="px-3 py-2.5">{skuOf(r.product, r.size) ? <span className="font-mono text-xs text-ink">{skuOf(r.product, r.size)}</span> : <span className="text-faint">—</span>}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`font-semibold tabular-nums ${r.qty < 0 ? "text-red-600" : r.qty <= 10 ? "text-amber-600" : "text-ink"}`}>{r.qty}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-end gap-1.5">
                                <input type="number" value={val}
                                  onChange={(e) => setCounted((c) => ({ ...c, [k]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveCount(r); }}
                                  className={`input h-8 w-20 py-0 text-right tabular-nums ${dirty ? "border-amber-400 ring-2 ring-amber-100" : ""}`} title="ยอดที่นับได้จริง" />
                                {dirty ? (
                                  <button onClick={() => saveCount(r)} disabled={savingKey === k}
                                    className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50">
                                    <Check size={14} /> {savingKey === k ? "…" : "ปรับ"}
                                  </button>
                                ) : (
                                  <button onClick={() => quickReceive(r)} className="rounded-md px-2 py-1 text-xs text-green-700 hover:bg-green-50">+ รับเข้า</button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
