"use client";
import { Fragment, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Combobox from "./Combobox";
import { receiveStock, adjustStock } from "@/lib/actions/stock";
import type { StockRow } from "@/lib/queries";
import { PERFUME_TYPES } from "@/lib/types";
import { PackagePlus, CheckCircle2, Search, History, FileUp, FileDown, Lock, Check, RotateCcw, ClipboardCheck } from "lucide-react";

type Status = "all" | "normal" | "low" | "out" | "neg";
const keyOf = (r: StockRow) => `${r.product}|${r.size}`;

function statusOf(qty: number) {
  if (qty < 0) return { label: "ติดลบ", cls: "bg-red-100 text-red-700", dot: "bg-red-500" };
  if (qty === 0) return { label: "หมด", cls: "bg-red-50 text-red-600", dot: "bg-red-400" };
  if (qty <= 10) return { label: "ใกล้หมด", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" };
  return { label: "ปกติ", cls: "bg-green-50 text-green-700", dot: "bg-green-500" };
}

export default function StockManager({ rows, products, sizes, initialLow, isAdmin }:
  { rows: StockRow[]; products: string[]; sizes: string[]; initialLow?: boolean; isAdmin: boolean }) {
  const router = useRouter();

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
  // เรียง: Grade (PARFUM→EDP+→EDT→EDP→อื่น→ไม่ระบุ) → ชื่อ A-Z → ขนาดใหญ่→เล็ก
  const GRADE_ORDER = ["PARFUM", "EDP+", "EDT", "EDP"];
  const gradeRank = (g: string | null) => { const i = GRADE_ORDER.indexOf(g || ""); return i < 0 ? (g ? 98 : 99) : i; };
  const mlOf = (s: string) => { const m = String(s || "").match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
  const sorted = useMemo(() => [...filtered].sort((a, b) =>
    gradeRank(a.grade) - gradeRank(b.grade)
    || a.product.localeCompare(b.product, "en")
    || mlOf(b.size) - mlOf(a.size)
  ), [filtered]);
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
  const [f, setF] = useState({ product: "", size: "", qty: "", note: "" });
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
  async function receive(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg(""); setBusy(true);
    const res = await receiveStock(f.product, f.size, Number(f.qty), f.note);
    setBusy(false);
    if (!res.ok) { setErr(res.error || "รับเข้าไม่สำเร็จ"); return; }
    setMsg(`รับเข้า ${f.product} ${f.size} +${f.qty} → คงเหลือ ${res.balance}`);
    setF({ product: "", size: "", qty: "", note: "" }); router.refresh();
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
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px_120px_1fr_auto]">
            <Combobox value={f.product} onChange={(v) => setF((s) => ({ ...s, product: v }))} options={products} placeholder="เลือกกลิ่น" />
            <Combobox value={f.size} onChange={(v) => setF((s) => ({ ...s, size: v }))} options={sizes} placeholder="ขนาด" />
            <input type="number" min={1} className="input" value={f.qty} onChange={(e) => setF((s) => ({ ...s, qty: e.target.value }))} placeholder="จำนวน" />
            <input className="input" value={f.note} onChange={(e) => setF((s) => ({ ...s, note: e.target.value }))} placeholder="หมายเหตุ (ถ้ามี)" />
            <button className="btn-primary" disabled={busy}>{busy ? "…" : "รับเข้า"}</button>
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

      <div className="flex items-center justify-between px-1 text-xs text-muted">
        <span>แสดง <b className="text-ink">{filtered.length.toLocaleString()}</b> จาก {rows.length.toLocaleString()} รายการ</span>
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
                <th className="px-3 py-3 text-right">คงเหลือ (ระบบ)</th>
                <th className="px-3 py-3">สถานะ</th>
                {isAdmin && <th className="px-3 py-3 text-right">นับได้จริง / ปรับยอด</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center text-muted">ไม่พบสินค้าตามตัวกรอง</td></tr>}
              {sorted.map((r, idx) => {
                const st = statusOf(r.qty);
                const k = keyOf(r);
                const val = counted[k] ?? String(r.qty);
                const dirty = counted[k] !== undefined && counted[k] !== "" && Number(counted[k]) !== r.qty;
                const showHeader = idx === 0 || sorted[idx - 1].grade !== r.grade;
                return (
                  <Fragment key={k}>
                  {showHeader && (
                    <tr className="border-t border-line bg-soft/70">
                      <td colSpan={isAdmin ? 6 : 5} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        {r.grade || "ไม่ระบุ Grade"}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-line hover:bg-soft/40">
                    <td className="px-4 py-2.5 font-medium text-ink">{r.product}</td>
                    <td className="px-3 py-2.5">{r.grade ? <span className="chip bg-brand-50 text-brand-600">{r.grade}</span> : <span className="text-faint">—</span>}</td>
                    <td className="px-3 py-2.5 text-muted">{r.size}</td>
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
