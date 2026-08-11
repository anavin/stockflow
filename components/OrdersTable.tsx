"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOrder } from "@/lib/actions/orders";
import type { OrderRow } from "@/lib/types";
import { Printer, Pencil, Trash2, PackageOpen } from "lucide-react";

export default function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function onDelete(orderNo: string) {
    if (!confirm(`ย้ายใบเบิก Order No. ${orderNo} ไปถังขยะ?`)) return;
    setBusy(orderNo);
    const res = await deleteOrder(orderNo);
    setBusy(null);
    if (!res.ok) { alert(res.error); return; }
    router.refresh();
  }

  if (orders.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 py-16 text-center">
        <PackageOpen size={40} className="text-faint" />
        <div className="text-sm text-muted">ยังไม่มีใบเบิก — สร้างใหม่หรือ นำเข้าจาก Excel/CSV</div>
        <Link href="/shopee/new" className="btn-primary">สร้างใบเบิกแรก</Link>
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
              <th className="px-4 py-3">วันที่</th>
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
                <td className="px-4 py-3 text-muted">{o.doc_date || "—"}</td>
                <td className="px-4 py-3">{o.receiver || o.username || "—"}</td>
                <td className="px-4 py-3 text-muted">{o.province || "—"}</td>
                <td className="px-4 py-3 text-center">
                  <span className="chip bg-brand-50 text-brand-600">{o.item_count}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <a href={`/api/print/${encodeURIComponent(o.order_no)}`} target="_blank" rel="noreferrer"
                      className="rounded-md p-1.5 text-muted hover:bg-brand-50 hover:text-brand-600" title="พิมพ์">
                      <Printer size={16} />
                    </a>
                    <Link href={`/shopee/${encodeURIComponent(o.order_no)}`}
                      className="rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink" title="แก้ไข">
                      <Pencil size={16} />
                    </Link>
                    <button onClick={() => onDelete(o.order_no)} disabled={busy === o.order_no}
                      className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600" title="ลบ">
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
