"use client";
import type { CustomerHistory, PastOrder } from "@/lib/actions/orders";
import { PlatformDot } from "./PlatformBadge";
import { History, MapPin, Copy, Plus, X } from "lucide-react";

/** การ์ดประวัติลูกค้าเก่า — โชว์ที่อยู่เดิม + ประวัติการซื้อรายออร์เดอร์ ให้กดคัดลอกเอง */
export default function CustomerHistoryCard({
  hist, onUseAddress, onFillItems, onClose,
}: {
  hist: CustomerHistory;
  onUseAddress: () => void;
  onFillItems: (o: PastOrder) => void;
  onClose: () => void;
}) {
  if (!hist.profile || hist.orders.length === 0) return null;
  const p = hist.profile;
  const addr = [p.address, [p.district, p.province].filter(Boolean).join(" "), p.postcode].filter(Boolean).join(" ");
  const itemsText = (o: PastOrder) =>
    o.items.map((it) => `${it.product}${it.size ? ` ${it.size}` : ""}${it.is_free ? " (แถม)" : ""} ×${it.qty}`).join(" · ");

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <History size={16} className="text-brand" />
          ประวัติลูกค้าเก่า — {p.receiver || "-"}
          <span className="chip bg-brand-50 text-brand-600">ซื้อมาแล้ว {hist.total_orders} ครั้ง</span>
        </div>
        <button type="button" onClick={onClose} className="text-muted hover:text-ink" title="ปิด"><X size={16} /></button>
      </div>

      {addr && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
          <div className="flex items-start gap-1.5 text-xs text-muted">
            <MapPin size={14} className="mt-0.5 shrink-0" /> <span>ที่อยู่ล่าสุด · {addr}</span>
          </div>
          <button type="button" onClick={onUseAddress}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink hover:bg-soft">
            <Copy size={13} /> ใช้ที่อยู่นี้
          </button>
        </div>
      )}

      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-faint">ประวัติการซื้อ (ล่าสุดก่อน)</div>
      <div className="space-y-2">
        {hist.orders.map((o) => (
          <div key={o.order_no} className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2">
            <div className="shrink-0 text-xs text-muted" style={{ minWidth: 64 }}>
              <div className="flex items-center gap-1.5 font-medium text-ink"><PlatformDot platform={o.platform} size={7} /> {o.doc_date || "-"}</div>
              <div className="font-mono text-[10px]">{o.doc_no || o.order_no}</div>
            </div>
            <div className="flex-1 text-xs text-ink">{itemsText(o) || "—"}</div>
            <button type="button" onClick={() => onFillItems(o)}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-brand-600 hover:bg-brand-50">
              <Plus size={13} /> เติมรายการนี้
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
