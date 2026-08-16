"use client";
import { Fragment, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Combobox from "./Combobox";
import { receiveStock, receiveUnitsBatch, adjustStock, resolveSku } from "@/lib/actions/stock";
import type { StockRow } from "@/lib/queries";
import { PERFUME_TYPES } from "@/lib/types";
import { PackagePlus, CheckCircle2, Search, History, FileUp, FileDown, Lock, Check, RotateCcw, ClipboardCheck, ChevronDown, ChevronRight, ScanBarcode, X, Plus } from "lucide-react";

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
  const [skuList, setSkuList] = useState<string[]>([]);   // SKU รายชิ้นของกลิ่นที่กำลังกรอก
  const [skuInput, setSkuInput] = useState("");
  type BatchLine = { product: string; size: string; grade: string; barcode: string; skus: string[] };
  const [batch, setBatch] = useState<BatchLine[]>([]);    // ตะกร้า: หลายกลิ่น/ขนาด รับเข้าทีเดียว
  const todayStr = new Date().toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
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
      const res = await fetch("/api/stock/sku-import", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) { setErr(data.error || "นำเข้าไม่สำเร็จ"); }
      else {
        const parts = [`นำเข้า ${data.added} ชิ้น (${data.groups} กลิ่น/ขนาด)`];
        if (data.dbDupes) parts.push(`ข้ามซ้ำในระบบ ${data.dbDupes}`);
        if (data.dupInFile) parts.push(`ซ้ำในไฟล์ ${data.dupInFile}`);
        if (data.errors?.length) parts.push(`ข้าม ${data.errors.length} แถวมีปัญหา`);
        setMsg(parts.join(" · "));
        if (data.errors?.length) setErr("แถวที่ข้าม: " + data.errors.slice(0, 8).map((e: any) => `#${e.row || "-"} ${e.reason}`).join(" | ") + (data.errors.length > 8 ? " …" : ""));
        router.refresh();
      }
    } catch { setErr("อัปโหลดไม่สำเร็จ"); }
    setBusy(false);
  }
  // SKU ของกลิ่นที่กำลังกรอก (รวมที่ค้างในช่อง input)
  const currentSkus = () => (skuInput.trim() ? [...skuList, skuInput.trim()] : skuList);
  const resetEntry = () => { setF({ barcode: "", product: "", size: "", grade: "", note: "" }); setSkuList([]); setSkuInput(""); };
  const batchTotal = batch.reduce((n, l) => n + l.skus.length, 0);
  const curCount = currentSkus().length;
  const hasCur = !!(f.product && f.size && curCount);
  const grandTotal = batchTotal + (hasCur ? curCount : 0);
  const grandLines = batch.length + (hasCur ? 1 : 0);

  // เพิ่มกลิ่นปัจจุบันลงตะกร้า แล้วเคลียร์ช่องเพื่อกรอกกลิ่นถัดไป
  function addToBatch() {
    setErr(""); setMsg("");
    if (!f.product || !f.size) { setErr("เลือกกลิ่น + ขนาดก่อนเพิ่มลงรายการ"); return; }
    const skus = currentSkus();
    if (!skus.length) { setErr("สแกน/ใส่ SKU อย่างน้อย 1 ชิ้น"); return; }
    setBatch((b) => [...b, { product: f.product, size: f.size, grade: f.grade, barcode: f.barcode.trim(), skus }]);
    resetEntry();
  }
  const removeBatchLine = (i: number) => setBatch((b) => b.filter((_, x) => x !== i));
  // ลบ SKU รายตัวออกจากบรรทัดในตะกร้า (ถ้าหมด → ลบบรรทัด)
  const removeBatchSku = (i: number, sku: string) => setBatch((b) => b.map((l, x) => x === i ? { ...l, skus: l.skus.filter((s) => s !== sku) } : l).filter((l) => l.skus.length));

  // รับเข้าทั้งตะกร้า (+ กลิ่นที่ค้างในช่อง ถ้ามี) ทีเดียว
  async function submitBatch(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    const lines: BatchLine[] = [...batch];
    if (hasCur) lines.push({ product: f.product, size: f.size, grade: f.grade, barcode: f.barcode.trim(), skus: currentSkus() });
    if (!lines.length) { setErr("ยังไม่มีรายการรับเข้า — สแกน SKU แล้วกด 'เพิ่มลงรายการ'"); return; }
    setBusy(true);
    const res = await receiveUnitsBatch(lines.map((l) => ({ product: l.product, size: l.size, skus: l.skus, barcode: l.barcode })));
    setBusy(false);
    if (!res.ok) { setErr(res.error || "รับเข้าไม่สำเร็จ"); return; }
    const dup = res.dupes?.length ? ` · ข้ามซ้ำ ${res.dupes.length}` : "";
    setMsg(`รับเข้า ${res.added} ชิ้น (${res.perLine?.length ?? lines.length} รายการ)${dup}`);
    setBatch([]); resetEntry(); router.refresh();
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
        <form onSubmit={submitBatch} className="card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><PackagePlus size={16} /> รับสินค้าเข้าสต๊อก</h2>
            <div className="flex gap-2">
              <a href="/api/stock/sku-template" className="btn-ghost text-xs"><FileDown size={14} /> เทมเพลต SKU</a>
              <button type="button" className="btn-ghost text-xs" disabled={busy} onClick={() => fileRef.current?.click()}>
                <FileUp size={14} /> {busy ? "กำลังนำเข้า…" : "นำเข้า SKU (Excel)"}
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) { importFile(file); e.target.value = ""; } }} />
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
          {/* 3) สแกน/ใส่ SKU รายชิ้น (1 ขวด = 1 SKU) */}
          <label className="label flex items-center gap-1"><ScanBarcode size={13} /> สแกน / ใส่ SKU รายชิ้น (1 ขวด = 1 SKU · กด Enter ทีละชิ้น)</label>
          <div className="flex flex-wrap gap-2">
            <input ref={skuRef} value={skuInput} onChange={(e) => setSkuInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSku(skuInput); } }}
              className="input flex-1 min-w-[220px] font-mono" placeholder="สแกน SKU ของชิ้นสินค้า แล้ว Enter" />
            <button type="button" onClick={addToBatch} className="btn-ghost whitespace-nowrap" disabled={busy || !hasCur}>
              <Plus size={15} /> เพิ่มลงรายการ{hasCur ? ` (${curCount})` : ""}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-faint">สแกนบาร์โค้ดครั้งเดียว แล้วสแกน/ใส่ SKU ของแต่ละชิ้นได้เรื่อยๆ (ไม่ต้องสแกนบาร์โค้ดใหม่)</p>
          {skuList.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead className="bg-soft text-left text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2">Barcode</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">รายชื่อ</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">วันที่รับเข้า</th>
                    <th className="w-12 px-3 py-2 text-right">ลบ</th>
                  </tr>
                </thead>
                <tbody>
                  {skuList.map((s) => {
                    const bc = skuOf(f.product, f.size) || f.barcode.trim();
                    return (
                    <tr key={s} className="border-t border-line">
                      <td className="px-3 py-1.5 font-mono text-xs text-muted">{bc || "—"}</td>
                      <td className="px-3 py-1.5 font-mono text-xs text-ink">{s}</td>
                      <td className="px-3 py-1.5">{f.product || "—"} <span className="text-muted">{f.size}</span></td>
                      <td className="px-3 py-1.5">{f.grade ? <span className="chip bg-brand-50 text-brand-600">{f.grade}</span> : <span className="text-faint">—</span>}</td>
                      <td className="px-3 py-1.5 text-muted">{todayStr}</td>
                      <td className="px-3 py-1.5 text-right">
                        <button type="button" onClick={() => setSkuList((l) => l.filter((x) => x !== s))} className="text-faint hover:text-red-500"><X size={14} /></button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-between bg-soft/40 px-3 py-1.5 text-xs text-muted">
                <span>{f.product || "กลิ่นนี้"} {f.size} — <b className="text-ink">{skuList.length}</b> ชิ้น (ยังไม่เพิ่มลงรายการ)</span>
                <button type="button" onClick={() => setSkuList([])} className="hover:text-ink">ล้าง</button>
              </div>
            </div>
          )}

          {/* ตะกร้า: หลายกลิ่น/ขนาด รับเข้าทีเดียว */}
          {batch.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-lg border border-brand-200">
              <div className="bg-brand-50/60 px-3 py-1.5 text-xs font-medium text-brand-700">รายการที่จะรับเข้า — {batch.length} กลิ่น/ขนาด · {batchTotal} ชิ้น</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-soft text-left text-xs text-muted">
                    <tr>
                      <th className="px-3 py-2">กลิ่น</th>
                      <th className="px-3 py-2">ขนาด</th>
                      <th className="px-3 py-2">Grade</th>
                      <th className="px-3 py-2">Barcode</th>
                      <th className="px-3 py-2 text-right">SKU</th>
                      <th className="w-12 px-3 py-2 text-right">ลบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.map((l, i) => (
                      <tr key={i} className="border-t border-line align-top">
                        <td className="px-3 py-1.5 font-medium text-ink">{l.product}</td>
                        <td className="px-3 py-1.5 text-muted">{l.size}</td>
                        <td className="px-3 py-1.5">{l.grade ? <span className="chip bg-brand-50 text-brand-600">{l.grade}</span> : <span className="text-faint">—</span>}</td>
                        <td className="px-3 py-1.5 font-mono text-xs text-muted">{l.barcode || "—"}</td>
                        <td className="px-3 py-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="mr-0.5 text-xs font-semibold tabular-nums text-muted">{l.skus.length} ชิ้น:</span>
                            {l.skus.map((s) => (
                              <span key={s} className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-0.5 font-mono text-xs text-ink">
                                {s}
                                <button type="button" onClick={() => removeBatchSku(i, s)} className="text-faint hover:text-red-500" title="ลบ SKU นี้"><X size={12} /></button>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <button type="button" onClick={() => removeBatchLine(i)} className="text-faint hover:text-red-500" title="ลบรายการนี้"><X size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted">
              {grandTotal > 0
                ? <>รวมที่จะรับเข้า <b className="text-ink">{grandTotal}</b> ชิ้น · {grandLines} กลิ่น/ขนาด{hasCur && batch.length > 0 ? " (รวมกลิ่นที่ค้างในช่อง)" : ""}</>
                : "สแกน SKU → กด 'เพิ่มลงรายการ' เพื่อสะสมหลายกลิ่น แล้วรับเข้าทีเดียว"}
            </span>
            <button type="submit" className="btn-primary" disabled={busy || grandTotal === 0}>
              {busy ? "กำลังรับเข้า…" : `รับเข้าทั้งหมด (${grandTotal} ชิ้น)`}
            </button>
          </div>
          {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
          {msg && <p className="mt-3 flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"><CheckCircle2 size={14} /> {msg}</p>}
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
                            <Link href={`/stock/units?product=${encodeURIComponent(r.product)}&size=${encodeURIComponent(r.size)}`}
                              title="คลิกดูสินค้ารายชิ้น (SKU) ของขนาดนี้"
                              className={`font-semibold tabular-nums underline decoration-dotted underline-offset-2 hover:decoration-solid ${r.qty < 0 ? "text-red-600" : r.qty <= 10 ? "text-amber-600" : "text-ink"}`}>{r.qty}</Link>
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
