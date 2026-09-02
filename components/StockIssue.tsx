"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { lookupOrderForIssue, confirmIssueByOrder, reverseIssue, resolveIssueSku, type IssueResult, type IssueLookup } from "@/lib/actions/stock";
import { PlatformBadge } from "./PlatformBadge";
import { scanBeep } from "@/lib/scan-feedback";
import { ScanLine, CheckCircle2, AlertTriangle, XCircle, Undo2, Camera, PackageCheck, X, Printer, StickyNote, ClipboardList } from "lucide-react";

const CameraScan = dynamic(() => import("./CameraScan"), { ssr: false });

type Entry = { at: string; res: IssueResult; input: string; reversed?: boolean; platform?: string | null };

const now = () => new Date().toLocaleTimeString("th-TH");

type SpecOpt = { label: string; for_bag: boolean };
export default function StockIssue({ isAdmin, initialOrder, specOptions = [] }: { isAdmin: boolean; initialOrder?: string; specOptions?: SpecOpt[] }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Entry[]>([]);
  const [scanOpen, setScanOpen] = useState(false);          // camera → Order No
  const [preview, setPreview] = useState<IssueLookup | null>(null);
  const [form, setForm] = useState<Record<number, { skus: string[]; spec: string }>>({});
  const [skuScanOpen, setSkuScanOpen] = useState(false);   // camera → สแกน SKU (จับคู่บรรทัดอัตโนมัติ)
  const [scanMsg, setScanMsg] = useState<{ type: "ok" | "warn" | "error"; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skuRef = useRef<HTMLInputElement>(null);

  async function onReverse(orderNo: string, idx: number) {
    if (!confirm(`ยกเลิกการตัดสต๊อกของ ${orderNo}? (คืนสต๊อกกลับ)`)) return;
    const res = await reverseIssue(orderNo);
    if (!res.ok) { alert(res.error); return; }
    setLog((l) => l.map((e, i) => (i === idx ? { ...e, reversed: true } : e)));
  }

  // ขั้น 1: สแกน/กรอก Order No. → ดึงรายการมาตรวจ
  async function lookup(codeArg?: string) {
    const on = (codeArg ?? value).trim().toUpperCase();
    if (!on || busy) return;
    setBusy(true);
    let res: IssueLookup;
    try { res = await lookupOrderForIssue(on); }
    catch { res = { ok: false, error: "ดึงรายการไม่สำเร็จ (ระบบขัดข้อง ลองใหม่)" }; }
    finally { setBusy(false); }
    setValue("");
    if (!res.ok) {
      scanBeep("error");
      setLog((l) => [{ at: now(), res: res as IssueResult, input: on, platform: res.platform }, ...l].slice(0, 30));
      inputRef.current?.focus();
      return;
    }
    // เตือน (เสียง warn) ถ้ามีบรรทัดที่สต๊อกไม่พอ — ไม่งั้น ok
    const short = res.items!.some((it) => it.tracked && it.qty > (it.stock ?? 0));
    scanBeep(short ? "warn" : "ok");
    const init: Record<number, { skus: string[]; spec: string }> = {};
    for (const it of res.items!) init[it.line_no] = { skus: it.sku ? it.sku.split(",").map((s) => s.trim()).filter(Boolean) : [], spec: it.spec || "" };
    setForm(init);
    setPreview(res);
  }

  // ขั้น 2: กดยืนยัน → บันทึก SKU+Spec แล้วตัดสต๊อก
  async function submitIssue() {
    if (!preview?.order_no || busy) return;
    // แต่ละบรรทัดควรมี SKU ครบตามจำนวน (qty>1 = หลาย serial) — เตือนถ้ายังไม่ครบ
    const incomplete = preview.items!.some((it) => it.needs_sku && (form[it.line_no]?.skus?.length || 0) < it.qty);
    if (incomplete && !window.confirm("บางรายการใส่ SKU ยังไม่ครบตามจำนวน — ยืนยันตัดสต๊อกเลยไหม?")) return;
    // เตือนก่อนตัดถ้าสต๊อกไม่พอ (จะทำให้ติดลบ) — ระบุกลิ่นที่ขาด
    const shortLines = preview.items!.filter((it) => it.tracked && it.qty > (it.stock ?? 0));
    if (shortLines.length && !window.confirm(
      `สต๊อกไม่พอ ${shortLines.length} รายการ (จะตัดจนติดลบ):\n` +
      shortLines.map((it) => `• ${it.product} ${it.size} — ต้องตัด ${it.qty} เหลือ ${it.stock ?? 0}`).join("\n") +
      `\n\nยืนยันตัดสต๊อกต่อไหม?`)) return;
    setBusy(true);
    const entries = preview.items!.map((it) => ({ line_no: it.line_no, skus: form[it.line_no]?.skus || [], spec: form[it.line_no]?.spec }));
    let res: IssueResult;
    try { res = await confirmIssueByOrder(preview.order_no, entries); }
    catch { res = { ok: false, error: "ตัดสต๊อกไม่สำเร็จ (ระบบขัดข้อง ลองใหม่)" }; }
    finally { setBusy(false); }
    scanBeep(res.ok ? (res.negatives?.length ? "warn" : "ok") : "error");
    setLog((l) => [{ at: now(), res, input: preview.order_no!, platform: preview.platform }, ...l].slice(0, 30));
    setPreview(null); setForm({});
    inputRef.current?.focus();
  }

  const setSpec = (line: number, v: string) => setForm((f) => ({ ...f, [line]: { ...f[line], spec: v } }));
  const addSerial = (line: number, v: string) => {
    const s = (v || "").trim(); if (!s) return;
    setForm((f) => { const cur = f[line]?.skus || []; if (cur.includes(s)) return f; return { ...f, [line]: { ...f[line], skus: [...cur, s] } }; });
  };
  const removeSerial = (line: number, s: string) => setForm((f) => ({ ...f, [line]: { ...f[line], skus: (f[line]?.skus || []).filter((x) => x !== s) } }));

  // สแกน SKU 1 ตัว → ตรวจ (มีในคลัง + ตรงกลิ่น/ขนาดใบเบิก + ไม่ซ้ำ + ไม่เกิน qty) → เพิ่มให้บรรทัดที่ตรงอัตโนมัติ
  async function scanForIssue(code: string) {
    const s = (code || "").trim(); if (!s || !preview?.order_no) return;
    // สแกนซ้ำ (ทุกบรรทัด)
    if (Object.values(form).some((v) => (v?.skus || []).includes(s))) { scanBeep("warn"); setScanMsg({ type: "warn", text: `สแกนซ้ำ: ${s}` }); return; }
    const res = await resolveIssueSku(preview.order_no, s);
    if (!res.ok || res.line_no == null) { scanBeep("error"); setScanMsg({ type: "error", text: res.error || "SKU ไม่ถูกต้อง" }); return; }
    const it = preview.items!.find((i) => i.line_no === res.line_no);
    const have = form[res.line_no]?.skus?.length || 0;
    if (it && have >= it.qty) { scanBeep("warn"); setScanMsg({ type: "warn", text: `${res.product} ${res.size} ครบ ${it.qty} แล้ว` }); return; }
    addSerial(res.line_no, s);
    scanBeep("ok");
    setScanMsg({ type: "ok", text: `✓ ${res.product} ${res.size} (${have + 1}/${it?.qty ?? "?"})` });
  }

  // มาจากปุ่ม "ตัดสต๊อก" ในหน้าใบเบิก (/stock/issue?order=XXX) → ดึงรายการให้อัตโนมัติ
  useEffect(() => {
    if (initialOrder) lookup(initialOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-5">
      {/* ซ้าย: สแกน + ตรวจรายการ */}
      <div className="space-y-5 lg:col-span-3">
      {!preview ? (
        <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="card p-5">
          <label className="label flex items-center gap-1"><ScanLine size={14} /> สแกน / กรอก Order No. (ดึงรายการมาตรวจก่อนตัด)</label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              autoFocus
              className="input flex-1 font-mono text-lg"
              value={value}
              onChange={(e) => setValue(e.target.value.toUpperCase())}
              placeholder="สแกนบาร์โค้ด หรือ พิมพ์ Order No. แล้ว Enter"
            />
            <button className="btn-primary" disabled={busy}>{busy ? "กำลังดึง…" : "ดึงรายการ"}</button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-faint">เครื่องสแกน USB/Bluetooth จะพิมพ์เลขให้แล้วกด Enter เอง — หรือใช้กล้องมือถือ</p>
            <button type="button" onClick={() => setScanOpen(true)} className="btn-ghost shrink-0"><Camera size={16} /> สแกนด้วยกล้อง</button>
          </div>
        </form>
      ) : (
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <PackageCheck size={16} className="text-brand" /> ตรวจรายการก่อนตัดสต๊อก
                <PlatformBadge platform={preview.platform} />
              </h3>
              <p className="text-xs text-muted">Order No. <span className="font-mono text-ink">{preview.order_no}</span> · {preview.doc_no || "-"} · {preview.items!.length} รายการ</p>
            </div>
            <button onClick={() => { setPreview(null); setForm({}); inputRef.current?.focus(); }} className="btn-ghost shrink-0"><X size={14} /> ยกเลิก</button>
          </div>

          {preview.note && (
            <div className="alert-warn mb-3 flex items-start gap-2">
              <StickyNote size={15} className="mt-0.5 shrink-0" />
              <div><span className="font-medium">หมายเหตุ:</span> {preview.note}</div>
            </div>
          )}

          {/* สแกน SKU ทีละขวด — ระบบจับคู่บรรทัดให้อัตโนมัติ + เตือนทันทีถ้าผิด */}
          <div className="mb-3 rounded-xl border-2 border-brand/30 bg-brand-50/40 p-3">
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-ink"><ScanLine size={14} /> สแกน SKU ทีละขวด — ระบบจับคู่บรรทัดให้เอง</label>
            <div className="flex gap-1">
              <input ref={skuRef} autoFocus className="input flex-1 font-mono text-base"
                placeholder="สแกน / กรอก SKU แล้ว Enter"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const el = e.target as HTMLInputElement; scanForIssue(el.value); el.value = ""; } }} />
              <button type="button" onClick={() => setSkuScanOpen(true)} className="btn-ghost shrink-0 px-2" title="สแกนด้วยกล้อง (ต่อเนื่องหลายขวด)"><Camera size={16} /></button>
            </div>
            {scanMsg && <div className={`mt-1.5 rounded-md px-2 py-1 text-xs font-medium ${scanMsg.type === "ok" ? "bg-green-50 text-green-700" : scanMsg.type === "warn" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{scanMsg.text}</div>}
          </div>

          <div className="space-y-2">
            {preview.items!.map((it) => (
              <div key={it.line_no} className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
                  <span><span className="font-medium text-ink">{it.product}</span> <span className="text-muted">{it.size}</span>{it.is_free && <span className="chip ml-1 bg-brand-50 text-brand-600">Free</span>}</span>
                  <span className="text-xs text-muted">จำนวน {it.qty} · {it.tracked ? `คงเหลือ ${it.stock}` : "ไม่ตัดสต๊อก"}</span>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] text-muted">SKU รายชิ้นที่สแกน</span>
                      {it.needs_sku && <span className={`text-[11px] font-medium tabular-nums ${(form[it.line_no]?.skus?.length || 0) >= it.qty ? "text-green-600" : "text-amber-600"}`}>{form[it.line_no]?.skus?.length || 0}/{it.qty}</span>}
                    </div>
                    {(form[it.line_no]?.skus?.length || 0) > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {form[it.line_no].skus.map((s) => (
                          <span key={s} className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 font-mono text-xs text-brand-700">
                            {s}<button type="button" onClick={() => removeSerial(it.line_no, s)} className="text-brand-600 hover:text-red-500" title="เอาออก"><X size={11} /></button>
                          </span>
                        ))}
                      </div>
                    ) : it.needs_sku ? (
                      <p className="text-[11px] text-faint">ยังไม่ได้สแกน — สแกน SKU ในช่องด้านบน</p>
                    ) : it.tracked ? (
                      <p className="text-[11px] text-faint">ตัดตามจำนวน {it.qty} · ไม่ต้องมี SKU (ตัวอย่าง {it.size})</p>
                    ) : (
                      <p className="text-[11px] text-faint">ไม่ตัดสต๊อก (ไม่ต้องมี SKU)</p>
                    )}
                  </div>
                  {(() => {
                    const cur = form[it.line_no]?.spec || "";
                    // สินค้าถุงกระดาษ → เลือกได้แค่สเป็กถุง (Size S/M); สินค้าปกติ → สเป็กปกติ
                    const opts = specOptions.filter((o) => (it.is_bag ? o.for_bag : !o.for_bag)).map((o) => o.label);
                    const extra = cur && !opts.includes(cur);
                    return (
                      <select className="input text-sm" value={cur} onChange={(e) => setSpec(it.line_no, e.target.value)} title="สเป็กสินค้า">
                        <option value="">{it.is_bag ? "— เลือกขนาดถุง —" : "— เลือกสเป็ก —"}</option>
                        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                        {extra && <option value={cur}>{cur}</option>}
                      </select>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>

          <button onClick={submitIssue} disabled={busy} className="btn-primary mt-4 w-full">
            <CheckCircle2 size={16} /> {busy ? "กำลังตัดสต๊อก…" : "ยืนยันตัดสต๊อก"}
          </button>
        </div>
      )}
      </div>

      {/* ขวา: ผลล่าสุด */}
      <div className="space-y-3 lg:col-span-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><ClipboardList size={15} className="text-brand" /> ผลล่าสุด</h3>
        {log.length > 0 ? (
          log.map((e, i) => <ResultCard key={i} entry={e} idx={i} isAdmin={isAdmin} onReverse={onReverse} />)
        ) : (
          <div className="card p-6 text-center text-sm text-muted">ยังไม่มีการตัดสต๊อกในรอบนี้ — สแกนใบเบิกด้านซ้ายเพื่อเริ่ม</div>
        )}
      </div>

      {scanOpen && (
        <CameraScan onClose={() => setScanOpen(false)} onScan={(code) => { setScanOpen(false); lookup(code); }} />
      )}
      {skuScanOpen && (
        <CameraScan onClose={() => setSkuScanOpen(false)} onScan={(code) => { scanForIssue(code); }} />
      )}
    </div>
  );
}

function ResultCard({ entry, idx, isAdmin, onReverse }: { entry: Entry; idx: number; isAdmin: boolean; onReverse: (o: string, i: number) => void }) {
  const { res, input, at, reversed, platform } = entry;

  if (!res.ok && res.alreadyIssued) {
    return (
      <div className="card border-amber-200 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
          <AlertTriangle size={16} /> {input} — ตัดสต๊อกไปแล้ว (ไม่ตัดซ้ำ) <PlatformBadge platform={platform} />
        </div>
        <div className="mt-0.5 text-xs text-muted">เลขที่ใบเบิก {res.doc_no || "-"} · {at}</div>
      </div>
    );
  }
  if (!res.ok) {
    return (
      <div className="card border-red-200 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-600"><XCircle size={16} /> {input} — {res.error}</div>
        <div className="mt-0.5 text-xs text-muted">{at}</div>
      </div>
    );
  }

  const hasNeg = (res.negatives?.length ?? 0) > 0;
  const skipped = res.skipped ?? [];
  return (
    <div className={`card p-4 ${reversed ? "border-line opacity-70" : hasNeg ? "border-amber-200" : "border-green-200"}`}>
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-sm font-semibold ${reversed ? "text-muted" : hasNeg ? "text-amber-700" : "text-green-700"}`}>
          {reversed ? <Undo2 size={16} /> : <CheckCircle2 size={16} />} {reversed ? "ยกเลิกแล้ว (คืนสต๊อก)" : "ตัดสต๊อกสำเร็จ"} — {res.order_no} <PlatformBadge platform={platform} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{res.doc_no} · {at}</span>
          {!reversed && (
            <a href={`/print/pdf/${encodeURIComponent(res.order_no!)}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-soft hover:text-ink">
              <Printer size={13} /> พิมพ์
            </a>
          )}
          {!reversed && (
            <button onClick={() => onReverse(res.order_no!, idx)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-red-50 hover:text-red-600">
              <Undo2 size={13} /> ยกเลิก
            </button>
          )}
        </div>
      </div>
      {hasNeg && !reversed && (
        <div className="mt-2 flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
          <AlertTriangle size={12} /> มี {res.negatives!.length} รายการสต๊อกติดลบ (สต๊อกไม่พอ ควรรับเข้าเพิ่ม)
        </div>
      )}
      <div className="mt-3 overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr><th className="px-3 py-1.5">กลิ่น</th><th className="px-3 py-1.5">ขนาด</th><th className="px-3 py-1.5 text-right">ตัด</th><th className="px-3 py-1.5 text-right">คงเหลือ</th></tr>
          </thead>
          <tbody>
            {res.lines!.map((l, i) => (
              <tr key={i} className="border-t border-line">
                <td className="px-3 py-1.5 font-medium">{l.product}</td>
                <td className="px-3 py-1.5 text-muted">{l.size}</td>
                <td className="px-3 py-1.5 text-right">-{l.qty}</td>
                <td className={`px-3 py-1.5 text-right font-semibold ${l.balance < 0 ? "text-red-600" : "text-ink"}`}>{l.balance}</td>
              </tr>
            ))}
            {skipped.map((l, i) => (
              <tr key={`s${i}`} className="border-t border-line text-faint">
                <td className="px-3 py-1.5">{l.product}</td>
                <td className="px-3 py-1.5">{l.size}</td>
                <td className="px-3 py-1.5 text-right">×{l.qty}</td>
                <td className="px-3 py-1.5 text-right text-xs">ไม่ตัดสต๊อก</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
