"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { restoreOrder, purgeOrder, bulkRestoreOrders, bulkPurgeOrders } from "@/lib/actions/orders";
import type { OrderRow } from "@/lib/types";
import { RotateCcw, Trash2, Trash, X } from "lucide-react";

export default function TrashTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const allChecked = orders.length > 0 && sel.size === orders.length;
  const someChecked = sel.size > 0 && !allChecked;
  const toggle = (o: string) => setSel((p) => { const n = new Set(p); n.has(o) ? n.delete(o) : n.add(o); return n; });
  const toggleAll = () => setSel(allChecked ? new Set() : new Set(orders.map((o) => o.order_no)));

  async function onRestore(orderNo: string) {
    setBusy(orderNo);
    const res = await restoreOrder(orderNo);
    setBusy(null);
    if (!res.ok) { alert(res.error); return; }
    setSel((p) => { const n = new Set(p); n.delete(orderNo); return n; });
    router.refresh();
  }
  async function onPurge(orderNo: string) {
    if (!confirm(`ลบถาวร Order No. ${orderNo}? กู้คืนไม่ได้อีก`)) return;
    setBusy(orderNo);
    const res = await purgeOrder(orderNo);
    setBusy(null);
    if (!res.ok) { alert(res.error); return; }
    setSel((p) => { const n = new Set(p); n.delete(orderNo); return n; });
    router.refresh();
  }
  async function bulkRestore() {
    const list = [...sel];
    if (!list.length || !confirm(`กู้คืน ${list.length} รายการที่เลือก?`)) return;
    setBulkBusy(true);
    const res = await bulkRestoreOrders(list);
    setBulkBusy(false);
    if (!res.ok) { alert(res.error); return; }
    setSel(new Set()); router.refresh();
  }
  async function bulkPurge() {
    const list = [...sel];
    if (!list.length || !confirm(`ลบถาวร ${list.length} รายการที่เลือก? กู้คืนไม่ได้อีก`)) return;
    setBulkBusy(true);
    const res = await bulkPurgeOrders(list);
    setBulkBusy(false);
    if (!res.ok) { alert(res.error); return; }
    setSel(new Set()); router.refresh();
  }

  if (orders.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 py-16 text-center">
        <Trash size={40} className="text-faint" />
        <div className="text-sm text-muted">ถังขยะว่าง</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sel.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-ink">
            <button onClick={() => setSel(new Set())} className="text-muted hover:text-ink" title="ล้างที่เลือก"><X size={16} /></button>
            เลือกไว้ <b>{sel.size}</b> รายการ
          </div>
          <div className="flex gap-2">
            <button onClick={bulkRestore} disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50">
              <RotateCcw size={15} /> กู้คืนที่เลือก
            </button>
            <button onClick={bulkPurge} disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              <Trash2 size={15} /> {bulkBusy ? "กำลังลบ…" : "ลบถาวรที่เลือก"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 cursor-pointer accent-brand"
                    checked={allChecked} ref={(el) => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll} aria-label="เลือกทั้งหมด" />
                </th>
                <th className="px-4 py-3">เลขที่ใบเบิก</th>
                <th className="px-4 py-3">Order No.</th>
                <th className="px-4 py-3">ผู้รับ</th>
                <th className="px-4 py-3">จังหวัด</th>
                <th className="px-4 py-3 text-center">รายการ</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const checked = sel.has(o.order_no);
                return (
                  <tr key={o.order_no} className={`border-t border-line hover:bg-soft/50 ${checked ? "bg-brand-50/40" : ""}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" className="h-4 w-4 cursor-pointer accent-brand"
                        checked={checked} onChange={() => toggle(o.order_no)} aria-label={`เลือก ${o.order_no}`} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-ink">{o.doc_no || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{o.order_no}</td>
                    <td className="px-4 py-3">{o.receiver || o.username || "—"}</td>
                    <td className="px-4 py-3 text-muted">{o.province || "—"}</td>
                    <td className="px-4 py-3 text-center"><span className="chip bg-brand-50 text-brand-600">{o.item_count}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onRestore(o.order_no)} disabled={busy === o.order_no}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-green-700 hover:bg-green-50" title="กู้คืน">
                          <RotateCcw size={14} /> กู้คืน
                        </button>
                        <button onClick={() => onPurge(o.order_no)} disabled={busy === o.order_no}
                          className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600" title="ลบถาวร">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
