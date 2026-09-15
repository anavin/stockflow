"use client";
import { useEffect, useState } from "react";
import { wholesaleReceiptLines, confirmWholesaleReceipt, type ReceiptLine } from "@/lib/actions/wholesale-delivery";
import { X, PackageCheck, CheckCheck, Loader2 } from "lucide-react";

/** โมดัลยืนยัน "ปลายทางรับ" — กรอกจำนวนที่รับต่อบรรทัด (รับบางส่วนได้) · ครบทุกบรรทัด = รับครบ */
export default function WholesaleReceiptModal({ orderNo, docNo, onClose, onDone }: {
  orderNo: string; docNo?: string | null; onClose: () => void; onDone: () => void;
}) {
  const [items, setItems] = useState<ReceiptLine[] | null>(null);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await wholesaleReceiptLines(orderNo);
      if (!res.ok || !res.items) { setErr(res.error || "โหลดรายการไม่สำเร็จ"); setItems([]); return; }
      setItems(res.items);
      // ค่าเริ่มต้น = จำนวนที่เคยรับ (ถ้ามี) ไม่งั้น = จำนวนเต็ม (สมมติรับครบ ผู้ใช้ค่อยลดถ้ารับไม่ครบ)
      const init: Record<number, number> = {};
      for (const it of res.items) init[it.line_no] = it.received_qty == null ? it.qty : it.received_qty;
      setQty(init);
    })();
  }, [orderNo]);

  const setAllFull = () => { if (items) setQty(Object.fromEntries(items.map((it) => [it.line_no, it.qty]))); };
  const totalOrdered = (items || []).reduce((s, it) => s + it.qty, 0);
  const totalRecv = (items || []).reduce((s, it) => s + (qty[it.line_no] ?? 0), 0);
  const willBeFull = items != null && items.length > 0 && items.every((it) => (qty[it.line_no] ?? 0) >= it.qty);

  async function submit() {
    if (!items) return;
    setBusy(true); setErr(null);
    try {
      const lines = items.map((it) => ({ line_no: it.line_no, received_qty: qty[it.line_no] ?? 0 }));
      const res = await confirmWholesaleReceipt(orderNo, lines);
      if (!res.ok) { setErr(res.error || "ยืนยันไม่สำเร็จ"); return; }
      onDone();
    } catch { setErr("ยืนยันไม่สำเร็จ (ระบบขัดข้อง)"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><PackageCheck size={16} className="text-green-600" /> ยืนยันปลายทางรับ</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-soft"><X size={18} /></button>
        </header>

        <div className="max-h-[55vh] overflow-y-auto px-5 py-3">
          <p className="mb-2 text-xs text-muted">Order No. <span className="font-mono text-ink">{orderNo}</span>{docNo ? ` · ${docNo}` : ""}</p>
          {items == null ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted"><Loader2 size={16} className="animate-spin" /> กำลังโหลด…</div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">ไม่มีรายการ</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button onClick={setAllFull} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-muted hover:bg-soft"><CheckCheck size={13} /> รับครบทุกบรรทัด</button>
              </div>
              {items.map((it) => {
                const v = qty[it.line_no] ?? 0;
                const partial = v < it.qty;
                return (
                  <div key={it.line_no} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-ink">{it.product} <span className="text-muted">{it.size}</span></div>
                      <div className="text-[11px] text-faint">สั่ง {it.qty}{partial && v >= 0 ? ` · รับ ${v}` : ""}</div>
                    </div>
                    <input type="number" min={0} max={it.qty} value={v}
                      onChange={(e) => setQty((q) => ({ ...q, [it.line_no]: Math.max(0, Math.min(it.qty, Number(e.target.value) || 0)) }))}
                      className={`input h-8 w-20 text-right text-sm ${partial ? "border-amber-300 text-amber-700" : ""}`} />
                    <span className="w-6 shrink-0 text-xs text-faint">/ {it.qty}</span>
                  </div>
                );
              })}
            </div>
          )}
          {err && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p>}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
          <span className="text-xs text-muted">รับ <b className={willBeFull ? "text-green-600" : "text-amber-600"}>{totalRecv}</b> / {totalOrdered} ชิ้น · <span className={willBeFull ? "text-green-600" : "text-amber-600"}>{willBeFull ? "รับครบ" : "รับบางส่วน"}</span></span>
          <button onClick={submit} disabled={busy || !items?.length} className="btn-primary disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />} ยืนยันรับ
          </button>
        </footer>
      </div>
    </div>
  );
}
