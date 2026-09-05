"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { lookupOrderForReturn, confirmReturn, type ReturnLookup, type ReturnItemPreview } from "@/lib/actions/returns";
import { PlatformBadge, PlatformDot } from "./PlatformBadge";
import type { ReturnTodayRow } from "@/lib/queries";
import { scanBeep } from "@/lib/scan-feedback";
import { ScanLine, Camera, Undo2, PackageCheck, X, CheckCircle2, RotateCcw, Trash2, ClipboardList } from "lucide-react";

const CameraScan = dynamic(() => import("./CameraScan"), { ssr: false });

const REASONS = ["ลูกค้าตีกลับ (ไม่รับพัสดุ)", "ลูกค้าเปลี่ยนใจ / ขอคืน", "ส่งผิด / ผิดรายการ", "ชำรุด/เสียหายจากขนส่ง", "อื่นๆ"];
const tOf = (v?: string | number | null) => (v ? new Date(v).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "—");

type Disp = "restock" | "damaged" | "none";
type Form = Record<number, { qty: number; disp: Disp }>;
type Done = { order_no: string; platform?: string | null; restocked: number; damaged: number; skipped: number; at: number };

export default function ReturnScanner({ todayReturns = [] }: { todayReturns?: ReturnTodayRow[] }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [preview, setPreview] = useState<ReturnLookup | null>(null);
  const [form, setForm] = useState<Form>({});
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [log, setLog] = useState<Done[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // ค่าเริ่มต้นต่อรายการ: คืนเต็มจำนวนที่เหลือ · คืนเข้าสต๊อกได้→restock · ของแถม→ไม่นับ · ที่เหลือ→ชำรุด
  function initForm(items: ReturnItemPreview[], issued: boolean): Form {
    const f: Form = {};
    for (const it of items) {
      const canRestock = it.tracked && issued;
      f[it.line_no] = { qty: it.remaining, disp: canRestock ? "restock" : it.is_free ? "none" : "damaged" };
    }
    return f;
  }

  async function lookup(codeArg?: string) {
    const code = (codeArg ?? value).trim();
    if (!code || busy) return;
    setBusy(true); setErr(null);
    let res: ReturnLookup;
    try { res = await lookupOrderForReturn(code); } catch { res = { ok: false, error: "ดึงรายการไม่สำเร็จ" }; }
    setBusy(false);
    if (!res.ok) { scanBeep("error"); setErr(res.error || "ไม่พบ"); setPreview(null); return; }
    scanBeep(res.issued ? "ok" : "warn");   // warn = ยังไม่ตัดสต๊อก คืนเข้าสต๊อกไม่ได้
    setValue(""); setPreview(res); setForm(initForm(res.items || [], !!res.issued));
  }

  const setQty = (line: number, qty: number, max: number) => setForm((f) => ({ ...f, [line]: { ...f[line], qty: Math.max(0, Math.min(max, qty)) } }));
  const setDisp = (line: number, disp: Disp) => setForm((f) => ({ ...f, [line]: { ...f[line], disp } }));

  const totals = (() => {
    let restock = 0, damaged = 0, none = 0;
    for (const it of preview?.items || []) {
      const v = form[it.line_no]; if (!v || v.qty <= 0) continue;
      if (v.disp === "restock") restock += v.qty; else if (v.disp === "damaged") damaged += v.qty; else none += v.qty;
    }
    return { restock, damaged, none };
  })();

  async function submit() {
    if (!preview?.order_no || busy) return;
    const entries = Object.entries(form)
      .map(([line, v]) => ({ line_no: Number(line), qty: v.qty, disposition: v.disp }))
      .filter((e) => e.qty > 0);
    if (!entries.length) { setErr("ยังไม่ได้เลือกจำนวนที่จะคืน"); return; }
    // ยืนยันก่อนบันทึก — โดยเฉพาะ "คืนสต๊อก" (default) ที่ดันของกลับเป็นของขายได้ ย้อนยาก
    const restockN = entries.filter((e) => e.disposition === "restock").reduce((a, e) => a + e.qty, 0);
    const damagedN = entries.filter((e) => e.disposition === "damaged").reduce((a, e) => a + e.qty, 0);
    const summary = [restockN > 0 ? `คืนเข้าสต๊อกขาย ${restockN}` : "", damagedN > 0 ? `ชำรุด ${damagedN}` : ""].filter(Boolean).join(" · ");
    if (!confirm(`ยืนยันรับคืน ${preview.order_no}?\n${summary}\n\n${restockN > 0 ? "⚠ ของที่ 'คืนสต๊อก' จะกลับไปเป็นสินค้าขายได้ทันที — ถ้าชำรุดให้เลือก 'ชำรุด'" : ""}`)) return;
    setBusy(true); setErr(null);
    const res = await confirmReturn(preview.order_no, entries, reason, note);
    setBusy(false);
    if (!res.ok) { setErr(res.error || "รับคืนไม่สำเร็จ"); return; }
    setLog((l) => [{ order_no: res.order_no!, platform: preview.platform, restocked: res.restocked || 0, damaged: res.damaged || 0, skipped: res.skipped || 0, at: Date.now() }, ...l]);
    setPreview(null); setForm({}); setNote("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    // ธีมม่วง (รับคืน) — override --brand เฉพาะหน้านี้ให้ปุ่มหลักเด่น; สีผลลัพธ์ เขียว/แดง ไม่เปลี่ยน
    <div className="grid items-start gap-5 lg:grid-cols-5"
      style={{ ["--brand" as any]: "109 75 214", ["--brand-600" as any]: "90 55 196", ["--brand-50" as any]: "239 234 252" }}>
      <div className="space-y-5 lg:col-span-3">
        {!preview ? (
          <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="card p-5">
            <label className="label flex items-center gap-1"><Undo2 size={14} /> สแกน SKU/บาร์โค้ดขวด หรือ Order No. ที่ตีกลับ (รับคืนได้เฉพาะที่ส่งแล้ว)</label>
            <div className="flex gap-2">
              <input ref={inputRef} autoFocus className="input flex-1 font-mono text-lg" value={value}
                onChange={(e) => setValue(e.target.value.toUpperCase())} placeholder="สแกน SKU/บาร์โค้ดขวด หรือ Order No. แล้ว Enter" />
              <button className="btn-primary" disabled={busy}>{busy ? "กำลังดึง…" : "ดึงรายการ"}</button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-faint">รับคืน = ลูกค้าส่งของกลับจริง · ต่างจาก "ยกเลิกการตัด" (แก้ตอนตัดผิด)</p>
              <button type="button" onClick={() => setScanOpen(true)} className="btn-ghost shrink-0"><Camera size={16} /> สแกนด้วยกล้อง</button>
            </div>
            {err && <div className="alert-error mt-3">{err}</div>}
          </form>
        ) : (
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><PackageCheck size={16} className="text-brand" /> รับคืน — ตรวจก่อนบันทึก <PlatformBadge platform={preview.platform} /></h3>
                <p className="text-xs text-muted">Order No. <span className="font-mono text-ink">{preview.order_no}</span> · ผู้รับ {preview.receiver || "-"} · {preview.items!.length} รายการ{!preview.issued && " · ⚠️ ยังไม่ตัดสต๊อก (คืนเข้าสต๊อกไม่ได้)"}</p>
              </div>
              <button onClick={() => { setPreview(null); setForm({}); inputRef.current?.focus(); }} className="btn-ghost shrink-0"><X size={14} /> ยกเลิก</button>
            </div>

            <div className="space-y-2">
              {preview.items!.map((it) => {
                const v = form[it.line_no] || { qty: 0, disp: "none" as Disp };
                const canRestock = it.tracked && preview.issued;
                const full = it.remaining <= 0;
                return (
                  <div key={it.line_no} className={`rounded-lg border border-line p-3 ${full ? "opacity-60" : ""}`}>
                    <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
                      <span><span className="font-medium text-ink">{it.product}</span> <span className="text-muted">{it.size}</span>{it.is_free && <span className="chip-brand ml-1">Free</span>}</span>
                      <span className="text-xs text-muted">ส่งไป {it.qty}{it.returned > 0 && ` · คืนแล้ว ${it.returned}`}{full && " · คืนครบแล้ว"}</span>
                    </div>
                    {/* SKU รายชิ้นที่อยู่ในออเดอร์นี้ (เฉพาะขวดจริงที่ทำ serial) */}
                    {it.skus.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-muted">SKU ในออเดอร์:</span>
                        {it.skus.map((s) => (
                          <span key={s} className="inline-flex items-center rounded-md bg-brand-50 px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-brand-700">{s}</span>
                        ))}
                      </div>
                    )}
                    {!full && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {/* จำนวนที่คืน */}
                        <div className="inline-flex items-center overflow-hidden rounded-lg border border-line text-sm">
                          <button type="button" onClick={() => setQty(it.line_no, v.qty - 1, it.remaining)} className="px-2.5 py-1.5 text-muted hover:bg-soft">−</button>
                          <span className="min-w-8 border-x border-line px-2 py-1.5 text-center font-mono">{v.qty}</span>
                          <button type="button" onClick={() => setQty(it.line_no, v.qty + 1, it.remaining)} className="px-2.5 py-1.5 text-muted hover:bg-soft">+</button>
                          <span className="px-2 text-xs text-faint">/ {it.remaining}</span>
                        </div>
                        {/* ปลายทาง */}
                        <div className="inline-flex overflow-hidden rounded-lg border border-line text-xs font-semibold">
                          <button type="button" disabled={!canRestock} onClick={() => setDisp(it.line_no, "restock")}
                            title={canRestock ? "" : "คืนเข้าสต๊อกไม่ได้ (ขนาดตัวอย่าง/ยังไม่ตัดสต๊อก)"}
                            className={v.disp === "restock" ? "bg-green-600 px-3 py-1.5 text-white" : `px-3 py-1.5 text-muted ${canRestock ? "hover:bg-soft" : "cursor-not-allowed opacity-40"}`}>✓ คืนสต๊อก</button>
                          <button type="button" onClick={() => setDisp(it.line_no, "damaged")}
                            className={"border-l border-line " + (v.disp === "damaged" ? "bg-red-600 px-3 py-1.5 text-white" : "px-3 py-1.5 text-muted hover:bg-soft")}>⚠ ชำรุด</button>
                          <button type="button" onClick={() => setDisp(it.line_no, "none")}
                            title="ไม่นับสต๊อก (ของแถม/ไม่คิดเป็นของชำรุด) — บันทึกประวัติเฉยๆ"
                            className={"border-l border-line " + (v.disp === "none" ? "bg-slate-500 px-3 py-1.5 text-white" : "px-3 py-1.5 text-muted hover:bg-soft")}>∅ ไม่นับ</button>
                        </div>
                        {it.is_free && <span className="chip-brand">ของแถม</span>}
                        {v.qty === 0 && <span className="text-xs text-faint">= ไม่คืน (ลูกค้าเก็บไว้)</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="input text-sm">
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="input text-sm" placeholder="หมายเหตุ (ถ้ามี)" />
            </div>

            {err && <div className="alert-error mt-3">{err}</div>}
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-muted">คืนเข้าสต๊อก <b className="text-green-700">{totals.restock}</b> · ชำรุด <b className="text-red-700">{totals.damaged}</b>{totals.none > 0 && <> · ไม่นับ <b className="text-slate-600">{totals.none}</b></>}</span>
              <button onClick={submit} disabled={busy || (totals.restock + totals.damaged + totals.none === 0)} className="btn-primary">
                <CheckCircle2 size={16} /> {busy ? "กำลังบันทึก…" : "ยืนยันรับคืน"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ขวา: สรุป + ผลลัพธ์วันนี้ (จาก DB) */}
      <div className="space-y-3 lg:col-span-2">
        {(() => {
          const ordersToday = todayReturns.length + log.length;
          const damagedToday = todayReturns.reduce((a, r) => a + r.damaged, 0) + log.reduce((a, e) => a + e.damaged, 0);
          const doneNow = new Set(log.map((e) => e.order_no.toUpperCase()));
          const rows = todayReturns.filter((r) => !doneNow.has(r.order_no.toUpperCase()));
          return (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="card bg-green-50 p-4 text-center">
                  <div className="text-3xl font-bold text-green-700">{ordersToday.toLocaleString()}</div>
                  <div className="mt-0.5 text-xs font-medium text-green-700/80">คืนวันนี้ (ออเดอร์)</div>
                </div>
                <div className="card bg-red-50 p-4 text-center">
                  <div className="text-3xl font-bold text-red-700">{damagedToday.toLocaleString()}</div>
                  <div className="mt-0.5 text-xs font-medium text-red-700/80">ชำรุดวันนี้ (ชิ้น)</div>
                </div>
              </div>

              {log.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><ClipboardList size={15} className="text-brand" /> รับคืนล่าสุด (รอบนี้)</h3>
                  {log.map((e) => (
                    <div key={e.at} className="card p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-green-700"><CheckCircle2 size={16} /> รับคืนแล้ว · <span className="font-mono text-ink">{e.order_no}</span> <PlatformBadge platform={e.platform} /></div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {e.restocked > 0 && <span className="chip-ok"><RotateCcw size={12} /> คืนสต๊อก {e.restocked}</span>}
                        {e.damaged > 0 && <span className="chip-danger"><Trash2 size={12} /> ชำรุด {e.damaged}</span>}
                        {e.skipped > 0 && <span className="chip-muted">∅ ไม่นับ {e.skipped}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><Undo2 size={15} className="text-brand" /> คืนวันนี้ทั้งหมด <span className="text-muted">({ordersToday.toLocaleString()})</span></h3>
                {rows.length === 0 && log.length === 0 ? (
                  <div className="card p-6 text-center text-sm text-muted">ยังไม่มีการรับคืนวันนี้ — สแกน Order No. ที่ตีกลับด้านซ้าย</div>
                ) : rows.length > 0 ? (
                  <div className="space-y-2">
                    {rows.map((r) => (
                      <div key={r.order_no} className="card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink"><PlatformDot platform={r.platform} /> {r.order_no}</span>
                          <span className="text-[11px] text-faint">{tOf(r.at)}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                          {r.restocked > 0 && <span className="chip-ok"><RotateCcw size={11} /> คืนสต๊อก {r.restocked}</span>}
                          {r.damaged > 0 && <span className="chip-danger"><Trash2 size={11} /> ชำรุด {r.damaged}</span>}
                          {r.skipped > 0 && <span className="chip-muted">∅ ไม่นับ {r.skipped}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          );
        })()}
      </div>

      {scanOpen && (
        <CameraScan title="เล็ง Order No. ที่ตีกลับ" hint="วางบาร์โค้ด Order No. ให้อยู่ในกรอบ"
          onClose={() => setScanOpen(false)} onScan={(code) => { setScanOpen(false); lookup(code); }} />
      )}
    </div>
  );
}
