"use client";
import { Fragment, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import Combobox from "./Combobox";
const CameraScan = dynamic(() => import("./CameraScan"), { ssr: false });
import { receiveStock, receiveUnitsBatch, adjustStock, resolveSku } from "@/lib/actions/stock";
import type { StockRow } from "@/lib/queries";
import { PERFUME_TYPES } from "@/lib/types";
import { PackagePlus, CheckCircle2, Search, History, FileUp, FileDown, Lock, Check, RotateCcw, ClipboardCheck, ChevronDown, ChevronRight, ScanBarcode, X, Plus, Camera, AlertTriangle } from "lucide-react";

type Status = "all" | "normal" | "low" | "out" | "neg";
const keyOf = (r: StockRow) => `${r.product}|${r.size}`;

function statusOf(qty: number) {
  if (qty < 0) return { label: "ติดลบ", cls: "chip-danger", dot: "bg-red-500" };
  if (qty === 0) return { label: "หมด", cls: "chip-danger", dot: "bg-red-400" };
  if (qty <= 10) return { label: "ใกล้หมด", cls: "chip-warn", dot: "bg-amber-500" };
  return { label: "ปกติ", cls: "chip-ok", dot: "bg-green-500" };
}

export default function StockManager({ rows, products, sizes, initialLow, isAdmin, discontinued = {}, skuMap = {}, closedSkus = {}, emptyScents = [] }:
  { rows: StockRow[]; products: string[]; sizes: string[]; initialLow?: boolean; isAdmin: boolean; discontinued?: Record<string, string[]>; skuMap?: Record<string, string>; closedSkus?: Record<string, string[]>; emptyScents?: { name: string; grade: string | null }[] }) {
  const router = useRouter();
  const normKey = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
  const isDisc = (product: string, size: string) => (discontinued[normKey(product)] ?? []).includes(normKey(size));
  const skuOf = (product: string, size: string) => skuMap[`${normKey(product)}|${normKey(size)}`] ?? "";

  // ---- ซ่อน กลิ่น+ขนาด ที่ปิดการขาย (จัดการเปิด/ปิดในหน้าต่าง "จัดการการขาย") ----
  const isClosedSku = (product: string, size: string) => (closedSkus[normKey(product)] ?? []).includes(normKey(size));

  // ---- filters ----
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");        // "" = ทั้งหมด, "__none__" = ไม่ระบุ
  const [size, setSize] = useState("");
  const [status, setStatus] = useState<Status>(initialLow ? "low" : "all");

  const gradesInUse = useMemo(() => PERFUME_TYPES.filter((g) => rows.some((r) => r.grade === g)), [rows]);
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (isClosedSku(r.product, r.size)) return false;   // กลิ่น+ขนาดที่ปิดการขาย → ซ่อนจากสต๊อก (จัดการในหน้าต่างจัดการการขาย)
      if (t && !r.product.toLowerCase().includes(t)) return false;
      if (grade === "__none__" ? !!r.grade : grade && r.grade !== grade) return false;
      if (size && r.size !== size) return false;
      if (status === "normal" && !(r.qty > 10)) return false;
      if (status === "low" && !(r.qty > 0 && r.qty <= 10)) return false;   // ใกล้หมด = 1..10 (0 = "หมด" ดูที่ status out)
      if (status === "out" && r.qty !== 0) return false;
      if (status === "neg" && !(r.qty < 0)) return false;
      return true;
    });
  }, [rows, search, grade, size, status, closedSkus]);
  const hasFilter = !!(search || grade || size || status !== "all");
  // เรียง: เกรดน้ำหอม (A-Z) ก่อน → หมวดอื่น เช่น Car Perfume (A-Z) → ไม่ระบุ ท้ายสุด; ในกลุ่ม: ชื่อ A-Z → ขนาดใหญ่→เล็ก
  const mlOf = (s: string) => { const m = String(s || "").match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
  const gradeBucket = (g: string | null) => !g ? 2 : (PERFUME_TYPES as readonly string[]).includes(g) ? 0 : 1;
  // เรียงแถว: Grade → ชื่อกลิ่น → (เลิกผลิตท้ายกลิ่น) → ขนาดใหญ่ก่อน
  const sorted = useMemo(() => [...filtered].sort((a, b) =>
    gradeBucket(a.grade) - gradeBucket(b.grade)
    || (a.grade || "zzz").localeCompare(b.grade || "zzz", "en")
    || a.product.localeCompare(b.product, "en")
    || (isDisc(a.product, a.size) ? 1 : 0) - (isDisc(b.product, b.size) ? 1 : 0)
    || mlOf(b.size) - mlOf(a.size)
  ), [filtered, discontinued]);
  // จัดกลุ่มตาม "กลิ่น" (ชื่อขึ้นครั้งเดียวเป็นหัวข้อ → ขนาดไล่ข้างใต้) + สรุป
  // + รวมกลิ่นที่ "ยังไม่มีสต๊อก" (active แต่ยังไม่เคยรับเข้า) เป็นหัวข้อว่าง ให้เห็นทั้งแคตตาล็อก
  const groups = useMemo(() => {
    const m = new Map<string, StockRow[]>();
    for (const r of sorted) { if (!m.has(r.product)) m.set(r.product, []); m.get(r.product)!.push(r); }
    const real = [...m.entries()].map(([product, rs]) => ({
      product, grade: rs[0].grade, rows: rs, empty: false,
      total: rs.reduce((s, r) => s + r.qty, 0),
      low: rs.filter((r) => r.qty > 0 && r.qty <= 10).length,
      neg: rs.some((r) => r.qty < 0),
    }));
    const t = search.trim().toLowerCase();
    const empties = emptyScents
      .filter((s) => {
        if (t && !s.name.toLowerCase().includes(t)) return false;
        if (grade === "__none__" ? !!s.grade : grade && s.grade !== grade) return false;
        if (size || status !== "all") return false;   // มีตัวกรองขนาด/สถานะ → กลิ่นที่ยังไม่มีสต๊อกไม่เข้าเกณฑ์
        return true;
      })
      .map((s) => ({ product: s.name, grade: s.grade, rows: [] as StockRow[], empty: true, total: 0, low: 0, neg: false }));
    return [...real, ...empties].sort((a, b) =>
      gradeBucket(a.grade) - gradeBucket(b.grade)
      || (a.grade || "zzz").localeCompare(b.grade || "zzz", "en")
      || a.product.localeCompare(b.product, "en"));
  }, [sorted, emptyScents, search, grade, size, status]);
  const emptyCount = useMemo(() => groups.filter((g) => g.empty).length, [groups]);
  const lowCount = useMemo(() => rows.filter((r) => r.qty > 0 && r.qty <= 10).length, [rows]);   // ใกล้หมด = 1..10 (ตรงกับ statusOf/stockSummary/dashboard)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (g: string) => setCollapsed((s) => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n; });
  const collapseAll = () => setCollapsed(new Set(groups.map((g) => g.product)));
  const expandAll = () => setCollapsed(new Set());

  function exportCsv() {
    const header = ["Grade", "สินค้า", "ขนาด", "Barcode", "คงเหลือ", "สถานะ", "เลิกผลิต"];
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
    const nv = Number(v);
    if (!Number.isFinite(nv)) { alert("จำนวนไม่ถูกต้อง"); return; }
    // ยืนยันเมื่อสวิงเยอะ (fat-finger 500 แทน 50) — เปลี่ยน ≥100 หรือ ≥10 เท่า หรือติดลบ
    const delta = Math.abs(nv - r.qty);
    const bigSwing = delta >= 100 || (r.qty > 0 && (nv / r.qty >= 10 || nv <= 0));
    if (bigSwing && !confirm(`ตั้งยอด ${r.product} ${r.size}\nจาก ${r.qty} → ${nv} (เปลี่ยน ${nv - r.qty >= 0 ? "+" : ""}${nv - r.qty})\n\nยืนยันตั้งเป็นยอดใหม่?`)) return;
    setSavingKey(k);
    const res = await adjustStock(r.product, r.size, nv);
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
  type BatchLine = { product: string; size: string; grade: string; barcode: string; skus: string[] };
  const [batch, setBatch] = useState<BatchLine[]>([]);    // ตะกร้า: หลายกลิ่น/ขนาด รับเข้าทีเดียว
  const qtyRef = useRef<HTMLInputElement>(null);
  const [scanOpen, setScanOpen] = useState(false);   // กล้องสแกนบาร์โค้ด
  async function doResolveBarcode(code?: string) {
    const bc = (code ?? f.barcode).trim();
    if (!bc) return;
    setErr(""); setMsg("");
    if (code != null) setF((s) => ({ ...s, barcode: code }));
    const res = await resolveSku(bc);   // resolve จากบาร์โค้ดสินค้า → กลิ่น+ขนาด
    if (!res.ok) { setErr(res.error || "ไม่พบบาร์โค้ด"); return; }
    setF((s) => ({ ...s, barcode: bc, product: res.product!, size: res.size!, grade: res.grade || "" }));
    setTimeout(() => qtyRef.current?.focus(), 0);   // โฟกัสช่อง "จำนวน" ต่อทันที
  }
  // สร้างช่องกรอกเปล่า N ช่อง (ตามจำนวนที่รับเข้า) — user พิมพ์ SKU เองแต่ละช่อง
  const [slotN, setSlotN] = useState("");
  const setSkuAt = (i: number, v: string) => setSkuList((l) => l.map((x, k) => (k === i ? v : x)));
  const removeSkuAt = (i: number) => setSkuList((l) => l.filter((_, k) => k !== i));
  const [skuScanOpen, setSkuScanOpen] = useState(false);   // กล้องสแกน SKU ต่อเนื่อง
  // เติม SKU ที่สแกนได้ลงช่องว่างช่องแรก (ไม่มีช่องว่าง → ต่อท้าย) · กันซ้ำ
  const fillNextSku = (code: string) => {
    const s = code.trim(); if (!s) return;
    setSkuList((l) => {
      if (l.some((x) => x.trim() === s)) return l;
      const idx = l.findIndex((x) => !x.trim());
      if (idx >= 0) { const c = [...l]; c[idx] = s; return c; }
      return [...l, s];
    });
  };
  function addSlots() {
    setErr("");
    const n = parseInt(slotN, 10);
    if (!n || n < 1) { setErr("ใส่จำนวนช่อง (1–500)"); return; }
    if (skuList.length + n > 500) { setErr("รวมแล้วเกิน 500 ช่อง"); return; }
    const at = skuList.length;
    setSkuList((l) => [...l, ...Array(n).fill("")]);
    setSlotN("");
    setTimeout(() => document.getElementById(`sku-slot-${at}`)?.focus(), 0);
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
  // SKU ของกลิ่นที่กำลังกรอก — ตัดช่องว่าง + กันซ้ำ
  const currentSkus = () => [...new Set(skuList.map((s) => s.trim()).filter(Boolean))];
  const resetEntry = () => { setF({ barcode: "", product: "", size: "", grade: "", note: "" }); setSkuList([]); setSlotN(""); };
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
      {/* การ์ดใกล้หมด — กดแล้วกรองในหน้าเดิมทันที (ไม่ nav/ไม่ remount → ไม่เสีย batch/นับที่ค้าง) */}
      {lowCount > 0 && status !== "low" && (
        <button type="button" onClick={() => setStatus("low")}
          className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left hover:bg-amber-100">
          <AlertTriangle size={20} className="shrink-0 text-amber-600" />
          <div className="text-sm"><b className="text-amber-700">ใกล้หมด {lowCount.toLocaleString()} รายการ</b><div className="text-xs text-amber-600/80">คงเหลือ ≤ 10 — เตรียมเติมสต๊อก · กดเพื่อกรองเฉพาะที่ใกล้หมด</div></div>
        </button>
      )}
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
            <div className="flex flex-wrap gap-2">
              <a href="/api/stock/sku-template" className="btn-ghost text-xs"><FileDown size={14} /> เทมเพลต SKU</a>
              <button type="button" className="btn-ghost text-xs" disabled={busy} onClick={() => fileRef.current?.click()}>
                <FileUp size={14} /> {busy ? "กำลังนำเข้า…" : "นำเข้า SKU (Excel)"}
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) { importFile(file); e.target.value = ""; } }} />
            </div>
          </div>
          {/* 1) สแกนบาร์โค้ดสินค้า → เดากลิ่น+ขนาด */}
          <div className="mb-2 flex flex-wrap gap-2">
            <input value={f.barcode} onChange={(e) => setF((s) => ({ ...s, barcode: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doResolveBarcode(); } }}
              className="input flex-1 min-w-[200px] font-mono" placeholder="สแกนบาร์โค้ดสินค้า → เดากลิ่น/ขนาด" />
            <button type="button" onClick={() => setScanOpen(true)} className="btn-ghost" title="สแกนด้วยกล้อง"><Camera size={15} /> สแกน</button>
            <button type="button" onClick={() => doResolveBarcode()} className="btn-ghost"><Search size={15} /> ค้นหา</button>
          </div>
          {/* 2) รายการที่เจอ (เลือก/แก้เองได้) */}
          <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_160px_1fr]">
            <Combobox value={f.product} onChange={(v) => setF((s) => ({ ...s, product: v }))} options={products} placeholder="เลือกกลิ่น" />
            <Combobox value={f.size} onChange={(v) => setF((s) => ({ ...s, size: v }))} options={sizes} placeholder="ขนาด" />
            <input className="input" value={f.note} onChange={(e) => setF((s) => ({ ...s, note: e.target.value }))} placeholder="หมายเหตุ (ถ้ามี)" />
          </div>

          {/* 3) รายการที่เจอ + จำนวนที่รับเข้า → สร้างช่องกรอก SKU */}
          {f.product && f.size ? (
            <div className="mt-1 rounded-lg border border-brand-200 bg-brand-50/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-ink">{f.product}</span>
                  <span className="chip bg-white text-muted">{f.size}</span>
                  {f.grade && <span className="chip bg-brand-50 text-brand-600">{f.grade}</span>}
                  {(skuOf(f.product, f.size) || f.barcode.trim()) && <span className="font-mono text-xs text-faint">{skuOf(f.product, f.size) || f.barcode.trim()}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-ink">รับเข้ากี่ชิ้น?</label>
                  <input ref={qtyRef} value={slotN} onChange={(e) => setSlotN(e.target.value.replace(/[^0-9]/g, ""))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSlots(); } }}
                    className="input h-9 w-24 text-sm" placeholder="จำนวน" inputMode="numeric" />
                  <button type="button" onClick={addSlots} className="btn-primary h-9 whitespace-nowrap text-sm" disabled={busy}>
                    <Plus size={14} /> สร้างช่องกรอก
                  </button>
                </div>
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-faint"><ScanBarcode size={12} /> ใส่จำนวน → เกิดช่องกรอก SKU ตามจำนวน แล้วพิมพ์/สแกน SKU ลงแต่ละช่อง (1 ขวด = 1 SKU · Enter เลื่อนช่องถัดไป)</p>
            </div>
          ) : (
            <p className="mt-1 text-xs text-faint">สแกนบาร์โค้ดหรือเลือกกลิ่น/ขนาดก่อน แล้วระบุจำนวนที่จะรับเข้า</p>
          )}

          {skuList.length > 0 && (
            <div className="mt-3 rounded-lg border border-line p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1 font-medium text-ink"><ScanBarcode size={13} /> กรอก SKU รายชิ้น ({skuList.length} ช่อง)</span>
                <span className="flex items-center gap-1 text-muted">
                  <button type="button" onClick={() => setSkuScanOpen(true)} className="mr-1 inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-brand-700 hover:bg-brand-100"><Camera size={12} /> สแกน SKU</button>
                  กรอกแล้ว <b className="text-green-700">{curCount}</b>/{skuList.length}
                  <button type="button" onClick={() => setSkuList((l) => [...l, ""])} className="ml-2 text-brand-600 hover:underline">+ เพิ่มช่อง</button>
                  <button type="button" onClick={() => setSkuList([])} className="ml-1 hover:text-ink">ล้างทั้งหมด</button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                {skuList.map((s, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="w-5 shrink-0 text-right text-[11px] text-faint">{i + 1}</span>
                    <input id={`sku-slot-${i}`} value={s} onChange={(e) => setSkuAt(i, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const nx = document.getElementById(`sku-slot-${i + 1}`) as HTMLInputElement | null; if (nx) nx.focus(); else (e.target as HTMLInputElement).blur(); } }}
                      className="input h-8 flex-1 font-mono text-xs" placeholder={`SKU #${i + 1}`} />
                    <button type="button" onClick={() => removeSkuAt(i)} className="shrink-0 text-faint hover:text-red-500" title="ลบช่องนี้"><X size={13} /></button>
                  </div>
                ))}
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
                ? <>รวมที่จะรับเข้า <b className="text-ink">{grandTotal}</b> ชิ้น · {grandLines} กลิ่น/ขนาด{hasCur && batch.length > 0 ? " (รวมกลิ่นที่กำลังกรอก)" : ""}</>
                : "กรอก SKU แล้วกด 'รับเข้าทั้งหมด' — หรือ 'เพิ่มลงรายการ' เพื่อสะสมหลายกลิ่นก่อน"}
            </span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={addToBatch} className="btn-ghost whitespace-nowrap" disabled={busy || !hasCur}
                title="สะสมกลิ่นนี้ไว้ แล้วรับกลิ่นถัดไปต่อ">
                <Plus size={15} /> เพิ่มลงรายการ{hasCur ? ` (${curCount})` : ""}
              </button>
              <button type="submit" className="btn-primary" disabled={busy || grandTotal === 0}>
                {busy ? "กำลังรับเข้า…" : `รับเข้าทั้งหมด (${grandTotal} ชิ้น)`}
              </button>
            </div>
          </div>
          {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
          {msg && <p className="mt-3 flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"><CheckCircle2 size={14} /> {msg}</p>}
          {scanOpen && <CameraScan onClose={() => setScanOpen(false)} onScan={(code) => { setScanOpen(false); doResolveBarcode(code); }} />}
          {skuScanOpen && <CameraScan continuous title="สแกน SKU รายชิ้น (ต่อเนื่อง)" hint="เล็ง SKU/บาร์โค้ดของแต่ละชิ้น — สแกนต่อเนื่องได้ กดเสร็จสิ้นเมื่อครบ" onClose={() => setSkuScanOpen(false)} onScan={fillNextSku} />}
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
        <div className="flex flex-wrap items-center gap-3">
          <span><b className="text-ink">{groups.length.toLocaleString()}</b> กลิ่น · {filtered.length.toLocaleString()} ขนาด{emptyCount > 0 && <span className="text-faint"> · {emptyCount} ยังไม่มีสต๊อก</span>}</span>
          <button onClick={collapseAll} className="btn-ghost text-xs"><ChevronRight size={12} /> ย่อทั้งหมด</button>
          <button onClick={expandAll} className="btn-ghost text-xs"><ChevronDown size={12} /> ขยายทั้งหมด</button>
          <button onClick={exportCsv} className="btn-ghost text-xs"><FileDown size={12} /> Export ที่กรอง (CSV)</button>
        </div>
        {isAdmin && <span className="flex items-center gap-1"><ClipboardCheck size={13} /> พิมพ์ยอดที่นับได้จริงในช่อง “นับได้จริง” แล้ว Enter เพื่อปรับให้ตรง</span>}
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">ขนาด</th>
                <th className="px-3 py-3">Barcode</th>
                <th className="px-3 py-3 text-right">คงเหลือ (ระบบ)</th>
                <th className="px-3 py-3">สถานะ</th>
                {isAdmin && <th className="px-3 py-3 text-right">นับได้จริง / ปรับยอด</th>}
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-12 text-center text-muted">ไม่พบสินค้าตามตัวกรอง</td></tr>}
              {groups.map((grp) => {
                const open = !collapsed.has(grp.product);
                // กลิ่นที่ยังไม่มีสต๊อก (active แต่ไม่เคยรับเข้า) — หัวข้อว่าง + ปุ่มรับเข้า
                if (grp.empty) {
                  return (
                    <tr key={grp.product} className="border-t border-line bg-white">
                      <td colSpan={isAdmin ? 5 : 4} className="px-4 py-2">
                        <div className="flex w-full flex-wrap items-center gap-2">
                          <span className="ml-[23px] font-medium text-muted">{grp.product}</span>
                          {grp.grade && <span className="chip bg-brand-50/60 text-brand-500">{grp.grade}</span>}
                          <span className="rounded bg-soft px-1.5 py-0.5 text-[10px] font-medium text-muted">ยังไม่มีสต๊อก</span>
                          {isAdmin && (
                            <button type="button"
                              onClick={() => { setF((s) => ({ ...s, product: grp.product, grade: grp.grade || "" })); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                              className="ml-auto inline-flex items-center gap-0.5 rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-100">
                              <PackagePlus size={12} /> รับเข้า
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <Fragment key={grp.product}>
                    {/* หัวข้อกลิ่น (ชื่อขึ้นครั้งเดียว) + Grade + สรุป — คลิกพับ/ขยาย */}
                    <tr className="border-t border-line bg-soft/70">
                      <td colSpan={isAdmin ? 5 : 4} className="px-4 py-2">
                        <button onClick={() => toggleGroup(grp.product)} className="flex w-full items-center gap-2 text-left">
                          {open ? <ChevronDown size={15} className="shrink-0 text-faint" /> : <ChevronRight size={15} className="shrink-0 text-faint" />}
                          <span className="font-semibold text-ink">{grp.product}</span>
                          {grp.grade && <span className="chip bg-brand-50 text-brand-600">{grp.grade}</span>}
                          <span className="text-xs text-muted">· {grp.rows.length} ขนาด · รวม {grp.total.toLocaleString()} ชิ้น</span>
                          {grp.neg && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">ติดลบ</span>}
                          {!grp.neg && grp.low > 0 && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">ใกล้หมด {grp.low}</span>}
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
                          <td className="py-2.5 pl-11 pr-3">
                            <span className={disc ? "text-red-600 line-through" : "font-medium text-ink"}>{r.size}</span>
                            {disc && <span className="ml-1.5 rounded bg-red-50 px-1 py-0.5 text-[10px] font-medium text-red-600">เลิกผลิต</span>}
                          </td>
                          <td className="px-3 py-2.5">{skuOf(r.product, r.size)
                            ? <span className="font-mono text-xs text-ink">{skuOf(r.product, r.size)}</span>
                            : (isAdmin
                              ? <Link href={`/products?scent=${encodeURIComponent(r.product)}&size=${encodeURIComponent(r.size)}`}
                                  className="inline-flex items-center gap-0.5 text-xs text-brand-600 hover:underline" title="ไปเพิ่มบาร์โค้ดของกลิ่น/ขนาดนี้">
                                  <Plus size={11} /> เพิ่มบาร์โค้ด
                                </Link>
                              : <span className="text-faint">—</span>)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <Link href={`/stock/units?product=${encodeURIComponent(r.product)}&size=${encodeURIComponent(r.size)}`}
                              title="คลิกดูสินค้ารายชิ้น (SKU) ของขนาดนี้"
                              className={`font-semibold tabular-nums underline decoration-dotted underline-offset-2 hover:decoration-solid ${r.qty < 0 ? "text-red-600" : r.qty <= 10 ? "text-amber-600" : "text-ink"}`}>{r.qty}</Link>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={st.cls}>
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
                                    className="btn-warn px-2 py-1.5 text-xs">
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
