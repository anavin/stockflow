"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { restoreOrder, purgeOrder } from "@/lib/actions/orders";
import type { OrderRow } from "@/lib/types";
import { RotateCcw, Trash2, Trash } from "lucide-react";

export default function TrashTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function onRestore(orderNo: string) {
    setBusy(orderNo);
    const res = await restoreOrder(orderNo);
    setBusy(null);
    if (!res.ok) { alert(res.error); return; }
    router.refresh();
  }
  async function onPurge(orderNo: string) {
    if (!confirm(`ลบถาวร Order No. ${orderNo}? กู้คืนไม่ได้อีก`)) return;
    setBusy(orderNo);
    const res = await purgeOrder(orderNo);
    setBusy(null);
    if (!res.ok) { alert(res.error); return; }
    router.refresh();
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
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">เลขที่ใบเบิก</th>
              <th className="px-4 py-3">Order No.</th>
              <th className="px-4 py-3">ผู้รับ</th>
              <th className="px-4 py-3">จังหวัด</th>
              <th className="px-4 py-3 text-center">รายการ</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.order_no} className="border-t border-line hover:bg-soft/50">
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
