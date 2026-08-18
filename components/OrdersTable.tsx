"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOrder, bulkDeleteOrders } from "@/lib/actions/orders";
import type { OrderRow } from "@/lib/types";
import { Printer, Pencil, Trash2, PackageOpen, X, Zap, Clock, Check } from "lucide-react";

/** สถานะออเดอร์ — ชุดเดียวกัน ไล่สีตามขั้น: รอตัด (เหลือง) → ตัดแล้ว (ฟ้า) → ส่งแล้ว (เขียว) */
function StatusChip({ order }: { order: OrderRow }) {
  const base = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium";
  if (order.shipped_at)
    return <span className={`${base} border-emerald-200 bg-emerald-50 text-emerald-700`}><Check size={12} className="opacity-80" /> ส่งแล้ว</span>;
  if (order.stock_issued_at)
    return <span className={`${base} border-sky-200 bg-sky-50 text-sky-700`}><span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> ตัดแล้ว</span>;
  return <span className={`${base} border-amber-200 bg-amber-50 text-amber-700`}><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> รอตัด</span>;
}

export default function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());   // Order No. ที่ติ๊กไว้
  const [bulkBusy, setBulkBusy] = useState(false);

  const allChecked = orders.length > 0 && sel.size === orders.length;
  const someChecked = sel.size > 0 && !allChecked;

  function toggle(orderNo: string) {
    setSel((prev) => {
      const n = new Set(prev);
      n.has(orderNo) ? n.delete(orderNo) : n.add(orderNo);
      return n;
    });
  }
  function toggleAll() {
    setSel(allChecked ? new Set() : new Set(orders.map((o) => o.order_no)));
  }

  async function onDelete(orderNo: string) {
    if (!confirm(`ย้ายใบเบิก Order No. ${orderNo} ไปถังขยะ?`)) return;
    setBusy(orderNo);
    const res = await deleteOrder(orderNo);
    setBusy(null);
    if (!res.ok) { alert(res.error); return; }
    setSel((prev) => { const n = new Set(prev); n.delete(orderNo); return n; });
    router.refresh();
  }

  async function onBulkDelete() {
    const list = [...sel];
    if (list.length === 0) return;
    if (!confirm(`ย้ายใบเบิก ${list.length} รายการที่เลือก ไปถังขยะ?`)) return;
    setBulkBusy(true);
    const res = await bulkDeleteOrders(list);
    setBulkBusy(false);
    if (!res.ok) { alert(res.error); return; }
    setSel(new Set());
    router.refresh();
  }

  function onBulkPrint() {
    const list = [...sel];
    if (list.length === 0) return;
    if (list.length > 200) { alert("เลือกได้สูงสุด 200 ใบต่อการพิมพ์ 1 ครั้ง — กรุณาแบ่งพิมพ์เป็นชุด"); return; }
    if (list.length > 50 && !confirm(`เลือก ${list.length} ใบ — สร้างไฟล์ PDF จำนวนมากอาจใช้เวลาสักครู่ ดำเนินการต่อ?`)) return;
    const qs = list.map((n) => encodeURIComponent(n)).join(",");
    window.open(`/print/pdf-bulk?orders=${qs}`, "_blank", "noopener");
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
    <div className="space-y-3">
      {/* แถบเลือก — โผล่เมื่อมีการติ๊ก */}
      {sel.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-2.5">
          {/* ซ้าย: ตัวนับ + ปุ่มลบแบบจาง (แยกจากปุ่มพิมพ์คนละฝั่ง กันเผลอกด) */}
          <div className="flex items-center gap-3 text-sm text-ink">
            <button onClick={() => setSel(new Set())} className="text-muted hover:text-ink" title="ล้างที่เลือก"><X size={16} /></button>
            <span>เลือกไว้ <b>{sel.size}</b> รายการ</span>
            <button onClick={onBulkDelete} disabled={bulkBusy}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="ย้ายที่เลือกไปถังขยะ">
              <Trash2 size={14} /> {bulkBusy ? "กำลังลบ…" : "ลบ"}
            </button>
          </div>
          {/* ขวา: ปุ่มพิมพ์เป็นปุ่มหลักเด่น */}
          <button onClick={onBulkPrint} disabled={bulkBusy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
            <Printer size={16} /> พิมพ์ที่เลือก ({sel.size})
          </button>
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
                <th className="px-4 py-3">วันที่</th>
                <th className="px-4 py-3">ผู้รับ</th>
                <th className="px-4 py-3">จังหวัด</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3 text-center">รายการ</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const checked = sel.has(o.order_no);
                // ประเภทการส่ง (จากแท็กในหมายเหตุ) → แถบสีซ้าย + ป้าย + พื้นแต้มสีจาง
                const note = o.note || "";
                const isExpress = note.includes("ส่งด่วน");
                const isNow = note.includes("ส่งทันที");
                const rowTint = checked ? "bg-brand-50/40" : isExpress ? "bg-red-50/40" : isNow ? "bg-orange-50/40" : "";
                const stripe = isExpress ? "border-red-500" : isNow ? "border-orange-500" : "border-transparent";
                return (
                  <tr key={o.order_no} className={`border-t border-line hover:bg-soft/50 ${rowTint}`}>
                    <td className={`border-l-[3px] px-4 py-3 ${stripe}`}>
                      <input type="checkbox" className="h-4 w-4 cursor-pointer accent-brand"
                        checked={checked} onChange={() => toggle(o.order_no)} aria-label={`เลือก ${o.order_no}`} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-ink">{o.doc_no || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{o.order_no}</td>
                    <td className="px-4 py-3 text-muted">{o.doc_date || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="align-middle">{o.receiver || o.username || "—"}</span>
                      {isExpress && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 align-middle text-[10px] font-semibold text-red-700"><Zap size={10} /> ส่งด่วน</span>}
                      {isNow && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 align-middle text-[10px] font-semibold text-orange-700"><Clock size={10} /> ส่งทันที</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">{o.province || "—"}</td>
                    <td className="px-4 py-3"><StatusChip order={o} /></td>
                    <td className="px-4 py-3 text-center">
                      <span className="chip bg-brand-50 text-brand-600">{o.item_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a href={`/print/pdf/${encodeURIComponent(o.order_no)}`} target="_blank" rel="noreferrer"
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
