"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { receiveMaterial, issueMaterial, setReorderPoint, type ItemDesc } from "@/lib/actions/supply";
import { Plus, Minus, X, Bell, Check, AlertTriangle, History } from "lucide-react";

/** เกณฑ์ "ใกล้หมด" — ใช้จุดสั่งซื้อถ้าตั้งไว้ ไม่งั้น default 10 */
export function isLow(qty: number, reorder: number | null | undefined) {
  return qty <= (reorder != null ? reorder : 10);
}

/** คงเหลือ + ปุ่มรับเข้า/เบิก (เปิดแผงกรอก) + ช่องปรับยอด (นับได้จริง) ต่อ 1 รายการ */
export default function MaterialControls({ desc, qty, unit = "ชิ้น", reorder = null, canEdit }: {
  desc: ItemDesc; qty: number; unit?: string; reorder?: number | null; canEdit: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "receive" | "issue">(null);
  const low = isLow(qty, reorder);

  return (
    <div className="flex items-center justify-end gap-1.5">
      {low && qty >= 0 && <span className="chip-warn hidden text-[10px] sm:inline-block" title={`ใกล้หมด (จุดสั่งซื้อ ${reorder ?? 10})`}>ควรสั่งซื้อ</span>}
      <span className={`min-w-[3rem] text-right font-semibold tabular-nums ${qty < 0 ? "text-red-600" : low ? "text-amber-600" : "text-ink"}`}>{qty.toLocaleString()}</span>
      <span className="w-8 text-xs text-faint">{unit}</span>
      <Link href={`/stock/materials/moves?cat=${desc.category}&ref=${encodeURIComponent(desc.refKey)}`}
        className="rounded-md p-1 text-muted hover:bg-soft hover:text-ink" title="ดูประวัติรายการนี้"><History size={14} /></Link>
      {canEdit && (
        <>
          <button onClick={() => setMode("receive")} className="rounded-md p-1 text-green-600 hover:bg-green-50" title="รับเข้า"><Plus size={15} /></button>
          <button onClick={() => setMode("issue")} className="rounded-md p-1 text-red-500 hover:bg-red-50" title="เบิก / จ่ายออก"><Minus size={15} /></button>
        </>
      )}
      {mode && (
        <MaterialModal desc={desc} qty={qty} unit={unit} reorder={reorder} mode={mode}
          onClose={() => setMode(null)} onDone={() => { setMode(null); router.refresh(); }} />
      )}
    </div>
  );
}

function MaterialModal({ desc, qty, unit, reorder, mode: initial, onClose, onDone }: {
  desc: ItemDesc; qty: number; unit: string; reorder: number | null; mode: "receive" | "issue";
  onClose: () => void; onDone: () => void;
}) {
  const [mode, setMode] = useState<"receive" | "issue">(initial);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [rop, setRop] = useState(reorder != null ? String(reorder) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, [mode]);

  const n = Math.abs(Math.floor(Number(amount) || 0));
  const newQty = mode === "receive" ? qty + n : qty - n;
  const overIssue = mode === "issue" && n > qty;

  async function submit() {
    if (!n) { setErr("ใส่จำนวน"); return; }
    setBusy(true); setErr("");
    const r = mode === "receive"
      ? await receiveMaterial(desc, n, note)
      : await issueMaterial(desc, n, note);
    setBusy(false);
    if (!r.ok) { setErr(r.error || "ไม่สำเร็จ"); return; }
    onDone();
  }
  async function saveRop() {
    const val = rop.trim() === "" ? null : Number(rop);
    if (String(val ?? "") === String(reorder ?? "")) return;
    setBusy(true);
    const r = await setReorderPoint(desc, val);
    setBusy(false);
    if (!r.ok) { setErr(r.error || "ไม่สำเร็จ"); return; }
    onDone();
  }

  const isRcv = mode === "receive";
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">{desc.label}</div>
            <div className="text-xs text-muted">คงเหลือ <b className="tabular-nums text-ink">{qty.toLocaleString()}</b> {unit}</div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-soft"><X size={18} /></button>
        </div>

        {/* สลับ รับเข้า / เบิก */}
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-soft p-1">
          <button onClick={() => setMode("receive")} className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-sm font-medium transition-colors ${isRcv ? "bg-green-600 text-white shadow-sm" : "text-muted hover:text-ink"}`}><Plus size={14} /> รับเข้า</button>
          <button onClick={() => setMode("issue")} className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-sm font-medium transition-colors ${!isRcv ? "bg-red-500 text-white shadow-sm" : "text-muted hover:text-ink"}`}><Minus size={14} /> เบิก</button>
        </div>

        <label className="label">จำนวน ({unit})</label>
        <input ref={inputRef} type="number" inputMode="numeric" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          className="input text-lg font-semibold tabular-nums" placeholder="0" />

        {amount !== "" && n > 0 && (
          <div className={`mt-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${overIssue ? "bg-red-50 text-red-700" : isRcv ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-700"}`}>
            {overIssue && <AlertTriangle size={14} />}
            → คงเหลือใหม่ <b className="tabular-nums">{newQty.toLocaleString()}</b> {unit}
            {overIssue && <span className="ml-1 text-xs">(เบิกเกินยอด — จะติดลบ)</span>}
          </div>
        )}

        <label className="label mt-3">หมายเหตุ {isRcv ? "(ล็อต / ที่มา)" : "(เบิกไปทำอะไร)"} — เว้นว่างได้</label>
        <input value={note} onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          className="input" placeholder={isRcv ? "เช่น ล็อตผลิต 08/2026" : "เช่น แพ็คออเดอร์ SH-..."} />

        {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

        <button onClick={submit} disabled={busy || !n}
          className={`mt-4 w-full py-2.5 text-sm font-semibold ${isRcv ? "btn-success" : "btn-danger-solid"}`}>
          {busy ? "กำลังบันทึก…" : isRcv ? `รับเข้า ${n || ""} ${unit}` : `เบิก ${n || ""} ${unit}`}
        </button>

        {/* จุดสั่งซื้อ — แจ้งเตือนของใกล้หมด */}
        <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
          <Bell size={14} className="shrink-0 text-amber-500" />
          <span className="shrink-0 text-xs text-muted">แจ้งเตือนเมื่อ ≤</span>
          <input type="number" inputMode="numeric" value={rop} onChange={(e) => setRop(e.target.value)}
            className="input h-8 w-20 py-0 text-right text-xs tabular-nums" placeholder="10" />
          <span className="shrink-0 text-xs text-faint">{unit}</span>
          <button onClick={saveRop} disabled={busy || String(rop.trim() === "" ? null : Number(rop)) === String(reorder ?? "")}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-muted hover:bg-soft disabled:opacity-40">
            <Check size={12} /> ตั้งจุด
          </button>
        </div>
      </div>
    </div>
  );
}
