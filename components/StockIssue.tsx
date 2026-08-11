"use client";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { lookupOrderForIssue, confirmIssueByOrder, reverseIssue, type IssueResult, type IssueLookup } from "@/lib/actions/stock";
import { ScanLine, CheckCircle2, AlertTriangle, XCircle, Undo2, Camera, PackageCheck, X } from "lucide-react";

const CameraScan = dynamic(() => import("./CameraScan"), { ssr: false });

type Entry = { at: string; res: IssueResult; input: string; reversed?: boolean };

const now = () => new Date().toLocaleTimeString("th-TH");

export default function StockIssue({ isAdmin }: { isAdmin: boolean }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Entry[]>([]);
  const [scanOpen, setScanOpen] = useState(false);          // camera → Order No
  const [preview, setPreview] = useState<IssueLookup | null>(null);
  const [form, setForm] = useState<Record<number, { sku: string; spec: string }>>({});
  const [skuScanLine, setSkuScanLine] = useState<number | null>(null); // camera → a SKU field
  const inputRef = useRef<HTMLInputElement>(null);

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
    const res = await lookupOrderForIssue(on);
    setBusy(false);
    setValue("");
    if (!res.ok) {
      setLog((l) => [{ at: now(), res: res as IssueResult, input: on }, ...l].slice(0, 30));
      inputRef.current?.focus();
      return;
    }
    const init: Record<number, { sku: string; spec: string }> = {};
    for (const it of res.items!) init[it.line_no] = { sku: it.sku || "", spec: it.spec || "" };
    setForm(init);
    setPreview(res);
  }

  // ขั้น 2: กดยืนยัน → บันทึก SKU+Spec แล้วตัดสต๊อก
  async function confirm() {
    if (!preview?.order_no || busy) return;
    const missing = preview.items!.some((it) => it.tracked && !(form[it.line_no]?.sku || "").trim());
    if (missing && !window.confirm("บางรายการยังไม่ได้ใส่ SKU — ยืนยันตัดสต๊อกเลยไหม?")) return;
    setBusy(true);
    const entries = preview.items!.map((it) => ({ line_no: it.line_no, sku: form[it.line_no]?.sku, spec: form[it.line_no]?.spec }));
    const res = await confirmIssueByOrder(preview.order_no, entries);
    setBusy(false);
    setLog((l) => [{ at: now(), res, input: preview.order_no! }, ...l].slice(0, 30));
    setPreview(null); setForm({});
    inputRef.current?.focus();
  }

  const setField = (line: number, key: "sku" | "spec", v: string) =>
    setForm((f) => ({ ...f, [line]: { ...f[line], [key]: v } }));

  return (
    <div className="space-y-5">
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
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><PackageCheck size={16} className="text-brand" /> ตรวจรายการก่อนตัดสต๊อก</h3>
              <p className="text-xs text-muted">Order No. <span className="font-mono text-ink">{preview.order_no}</span> · {preview.doc_no || "-"} · {preview.items!.length} รายการ</p>
            </div>
            <button onClick={() => { setPreview(null); setForm({}); inputRef.current?.focus(); }} className="btn-ghost shrink-0"><X size={14} /> ยกเลิก</button>
          </div>

          <div className="space-y-2">
            {preview.items!.map((it) => (
              <div key={it.line_no} className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
                  <span><span className="font-medium text-ink">{it.product}</span> <span className="text-muted">{it.size}</span>{it.is_free && <span className="chip ml-1 bg-brand-50 text-brand-600">Free</span>}</span>
                  <span className="text-xs text-muted">จำนวน {it.qty} · {it.tracked ? `คงเหลือ ${it.stock}` : "ตัวอย่าง (ไม่ตัด)"}</span>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="flex gap-1">
                    <input className="input flex-1 font-mono text-sm" placeholder="สแกน/กรอก SKU"
                      value={form[it.line_no]?.sku || ""} onChange={(e) => setField(it.line_no, "sku", e.target.value)} />
                    <button type="button" onClick={() => setSkuScanLine(it.line_no)} className="btn-ghost shrink-0 px-2" title="สแกน SKU ด้วยกล้อง"><Camera size={16} /></button>
                  </div>
                  <input className="input text-sm" placeholder="Spec สินค้า (เช่น รุ่น/ล็อต)"
                    value={form[it.line_no]?.spec || ""} onChange={(e) => setField(it.line_no, "spec", e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <button onClick={confirm} disabled={busy} className="btn-primary mt-4 w-full">
            <CheckCircle2 size={16} /> {busy ? "กำลังตัดสต๊อก…" : "ยืนยันตัดสต๊อก"}
          </button>
        </div>
      )}

      {scanOpen && (
        <CameraScan onClose={() => setScanOpen(false)} onScan={(code) => { setScanOpen(false); lookup(code); }} />
      )}
      {skuScanLine != null && (
        <CameraScan onClose={() => setSkuScanLine(null)} onScan={(code) => { setField(skuScanLine, "sku", code); setSkuScanLine(null); }} />
      )}

      {log.length > 0 && (
        <div className="space-y-3">
          {log.map((e, i) => <ResultCard key={i} entry={e} idx={i} isAdmin={isAdmin} onReverse={onReverse} />)}
        </div>
      )}
    </div>
  );
}

function ResultCard({ entry, idx, isAdmin, onReverse }: { entry: Entry; idx: number; isAdmin: boolean; onReverse: (o: string, i: number) => void }) {
  const { res, input, at, reversed } = entry;

  if (!res.ok && res.alreadyIssued) {
    return (
      <div className="card border-amber-200 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
          <AlertTriangle size={16} /> {input} — ตัดสต๊อกไปแล้ว (ไม่ตัดซ้ำ)
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
          {reversed ? <Undo2 size={16} /> : <CheckCircle2 size={16} />} {reversed ? "ยกเลิกแล้ว (คืนสต๊อก)" : "ตัดสต๊อกสำเร็จ"} — {res.order_no}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{res.doc_no} · {at}</span>
          {isAdmin && !reversed && (
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
            <tr><th className="px-3 py-1.5">สินค้า</th><th className="px-3 py-1.5">ขนาด</th><th className="px-3 py-1.5 text-right">ตัด</th><th className="px-3 py-1.5 text-right">คงเหลือ</th></tr>
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
                <td className="px-3 py-1.5 text-right text-xs">ตัวอย่าง (ไม่ตัด)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
