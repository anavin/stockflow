"use client";
import { useRef, useState } from "react";
import { issueStockByOrder, reverseIssue, type IssueResult } from "@/lib/actions/stock";
import { ScanLine, CheckCircle2, AlertTriangle, XCircle, Undo2 } from "lucide-react";

type Entry = { at: string; res: IssueResult; input: string; reversed?: boolean };

export default function StockIssue({ isAdmin }: { isAdmin: boolean }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Entry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onReverse(orderNo: string, idx: number) {
    if (!confirm(`ยกเลิกการตัดสต๊อกของ ${orderNo}? (คืนสต๊อกกลับ)`)) return;
    const res = await reverseIssue(orderNo);
    if (!res.ok) { alert(res.error); return; }
    setLog((l) => l.map((e, i) => (i === idx ? { ...e, reversed: true } : e)));
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const on = value.trim().toUpperCase();
    if (!on || busy) return;
    setBusy(true);
    const res = await issueStockByOrder(on);
    setBusy(false);
    setLog((l) => [{ at: new Date().toLocaleTimeString("th-TH"), res, input: on }, ...l].slice(0, 30));
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="card p-5">
        <label className="label flex items-center gap-1"><ScanLine size={14} /> สแกน / กรอก Order No. เพื่อตัดสต๊อก</label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            autoFocus
            className="input flex-1 font-mono text-lg"
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            placeholder="สแกนบาร์โค้ด หรือ พิมพ์ Order No. แล้ว Enter"
          />
          <button className="btn-primary" disabled={busy}>{busy ? "กำลังตัด…" : "ตัดสต๊อก"}</button>
        </div>
        <p className="mt-2 text-xs text-faint">เครื่องสแกนจะพิมพ์เลขให้อัตโนมัติแล้วกด Enter — ระบบจะตัดสต๊อกตามรายการในใบเบิกทันที</p>
      </form>

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
