"use client";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { deleteOrder, bulkDeleteOrders } from "@/lib/actions/orders";
import { pushToCtw } from "@/lib/actions/ctw";
import { markWholesaleShipped } from "@/lib/actions/wholesale-delivery";
import { canCreatePlatform, isWholesalePlatform } from "@/lib/config";
import type { OrderRow } from "@/lib/types";
import WholesaleReceiptModal from "./WholesaleReceiptModal";
import { Printer, Pencil, Trash2, PackageOpen, X, Zap, Clock, Check, Send, CheckCircle2, Truck, PackageCheck } from "lucide-react";

/** สถานะออเดอร์ — ชุดเดียวกัน ไล่สีตามขั้น: รอตัด (เหลือง) → ตัดแล้ว (ฟ้า) → ส่งแล้ว (เขียว)
 *  + ป้ายการคืน (ถ้ามี) — return_status เป็น undefined ถ้า prod ยังไม่รัน migration รับคืน */
function StatusChip({ order }: { order: OrderRow }) {
  const ret = order.return_status;
  const retChip = ret === "full" ? <span className="chip-danger whitespace-nowrap">↩ คืนแล้ว</span>
    : ret === "partial" ? <span className="chip-warn whitespace-nowrap">↩ คืนบางส่วน</span> : null;
  const wh = isWholesalePlatform(order.platform);   // ค้าส่ง = มีขั้น "ส่งออก → ปลายทางรับ"
  const recv = order.received_qty ?? 0;
  const total = order.total_qty ?? 0;
  let base: ReactNode;
  if (order.shipped_at && wh) {
    base = order.received_at
      ? <span className="chip-ok whitespace-nowrap"><PackageCheck size={12} className="opacity-80" /> ปลายทางรับครบ</span>
      : recv > 0
      ? <span className="whitespace-nowrap inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700"><PackageCheck size={12} /> รับบางส่วน {recv}/{total}</span>
      : <span className="whitespace-nowrap inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700"><Truck size={12} /> ส่งออกแล้ว · รอยืนยัน</span>;
  } else if (order.shipped_at) {
    base = <span className="chip-ok whitespace-nowrap"><Check size={12} className="opacity-80" /> ส่งแล้ว</span>;
  } else if (order.stock_issued_at) {
    base = <span className="chip-info whitespace-nowrap"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> ตัดแล้ว</span>;
  } else {
    base = <span className="chip-warn whitespace-nowrap"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> รอตัด</span>;
  }
  if (!retChip) return base;
  return <span className="inline-flex flex-wrap items-center gap-1">{base}{retChip}</span>;
}

export default function OrdersTable({ orders, platform = "Shopee" }: { orders: OrderRow[]; platform?: string }) {
  const base = `/${platform.toLowerCase()}`;
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

  const isCtw = platform === "CTW";
  const isEveKp = isWholesalePlatform(platform) && !isCtw;   // Eve/KingPower = ส่งออก+ยืนยันรับ มือ (2 จังหวะ)
  const [receiptFor, setReceiptFor] = useState<{ order_no: string; doc_no: string | null } | null>(null);
  async function onPush(orderNo: string) {
    if (!confirm(`ส่งใบเบิก ${orderNo} ไปยังระบบ CTW?\n\nระบบ CTW จะรับรายการ + SKU ไปเข้าสต๊อกสาขา`)) return;
    setBusy(orderNo);
    try {
      const res = await pushToCtw(orderNo);
      if (!res.ok) { alert(res.error || "ส่งไม่สำเร็จ"); return; }
      router.refresh();
    } catch { alert("ส่งไม่สำเร็จ (ระบบขัดข้อง ลองใหม่)"); }
    finally { setBusy(null); }
  }
  async function onShip(orderNo: string) {
    if (!confirm(`ยืนยันส่งออกใบเบิก ${orderNo} ไปปลายทาง?\n\n(รอปลายทางแจ้งกลับแล้วค่อยกด "ยืนยันรับ" อีกที)`)) return;
    setBusy(orderNo);
    try {
      const res = await markWholesaleShipped(orderNo);
      if (!res.ok) { alert(res.error || "ส่งออกไม่สำเร็จ"); return; }
      router.refresh();
    } catch { alert("ส่งออกไม่สำเร็จ (ระบบขัดข้อง)"); }
    finally { setBusy(null); }
  }

  async function onDelete(orderNo: string) {
    if (!confirm(`ย้ายใบเบิก Order No. ${orderNo} ไปถังขยะ?`)) return;
    setBusy(orderNo);
    try {
      const res = await deleteOrder(orderNo);
      if (!res.ok) { alert(res.error); return; }
      setSel((prev) => { const n = new Set(prev); n.delete(orderNo); return n; });
      router.refresh();
    } catch { alert("ลบไม่สำเร็จ (ระบบขัดข้อง ลองใหม่)"); }
    finally { setBusy(null); }
  }

  async function onBulkDelete() {
    const list = [...sel];
    if (list.length === 0) return;
    if (!confirm(`ย้ายใบเบิก ${list.length} รายการที่เลือก ไปถังขยะ?`)) return;
    setBulkBusy(true);
    try {
      const res = await bulkDeleteOrders(list);
      if (!res.ok) { alert(res.error); return; }
      setSel(new Set());
      router.refresh();
    } catch { alert("ลบไม่สำเร็จ (ระบบขัดข้อง ลองใหม่)"); }
    finally { setBulkBusy(false); }
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
    const creatable = canCreatePlatform(platform);
    return (
      <div className="card flex flex-col items-center gap-3 py-16 text-center">
        <PackageOpen size={40} className="text-faint" />
        <div className="text-sm text-muted">
          {creatable ? "ยังไม่มีใบเบิก — สร้างใหม่หรือ นำเข้าจาก Excel/CSV" : "ยังไม่มีใบเบิก — รอใบเบิกจากระบบ CTW เข้ามาอัตโนมัติ"}
        </div>
        {creatable && <Link href={`${base}/new`} className="btn-primary">สร้างใบเบิกแรก</Link>}
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
              className="btn-danger px-2.5 py-1 text-xs"
              title="ย้ายที่เลือกไปถังขยะ">
              <Trash2 size={14} /> {bulkBusy ? "กำลังลบ…" : "ลบ"}
            </button>
          </div>
          {/* ขวา: ปุ่มพิมพ์เป็นปุ่มหลักเด่น */}
          <button onClick={onBulkPrint} disabled={bulkBusy} className="btn-primary">
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
                <th className="whitespace-nowrap px-4 py-3">เลขที่ใบเบิก</th>
                <th className="px-4 py-3">Order No.</th>
                <th className="whitespace-nowrap px-4 py-3">วันที่</th>
                <th className="px-4 py-3">ผู้รับ</th>
                <th className="px-4 py-3">จังหวัด</th>
                <th className="w-px whitespace-nowrap px-4 py-3">สถานะ</th>
                <th className="w-px px-3 py-3 text-center">รายการ</th>
                <th className="w-px whitespace-nowrap px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const checked = sel.has(o.order_no);
                // ประเภทการส่ง (จากแท็กในหมายเหตุ) → แถบสีซ้าย + ป้าย + พื้นแต้มสีจาง
                const note = o.note || "";
                // จับเฉพาะแท็กที่เป็น token จริง (ขอบเว้นวรรค) — กันจับคำที่ฝังใน ("จัดส่งด่วนพิเศษ")
                const isExpress = new RegExp("(^|\\s)ส่งด่วน(\\s|$)").test(note);
                const isNow = new RegExp("(^|\\s)ส่งทันที(\\s|$)").test(note);
                const rowTint = checked ? "bg-brand-50/40" : isExpress ? "bg-red-50/40" : isNow ? "bg-orange-50/40" : "";
                const stripe = isExpress ? "border-red-500" : isNow ? "border-orange-500" : "border-transparent";
                return (
                  <tr key={o.order_no} className={`border-t border-line hover:bg-soft/50 ${rowTint}`}>
                    <td className={`border-l-[3px] px-4 py-3 ${stripe}`}>
                      <input type="checkbox" className="h-4 w-4 cursor-pointer accent-brand"
                        checked={checked} onChange={() => toggle(o.order_no)} aria-label={`เลือก ${o.order_no}`} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-ink">{o.doc_no || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{o.order_no}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{o.doc_date || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="align-middle">{o.receiver || o.username || "—"}</span>
                      {isExpress && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 align-middle text-[10px] font-semibold text-red-700"><Zap size={10} /> ส่งด่วน</span>}
                      {isNow && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 align-middle text-[10px] font-semibold text-orange-700"><Clock size={10} /> ส่งทันที</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">{o.province || "—"}</td>
                    <td className="w-px whitespace-nowrap px-4 py-3"><StatusChip order={o} /></td>
                    <td className="w-px px-3 py-3 text-center">
                      <span className="chip bg-brand-50 text-brand-600">{o.item_count}</span>
                    </td>
                    <td className="w-px whitespace-nowrap px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isCtw && (o.ctw_received_at ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 whitespace-nowrap" title="ส่งไป CTW แล้ว">
                            <CheckCircle2 size={14} /> ส่ง CTW แล้ว
                          </span>
                        ) : o.stock_issued_at ? (
                          <button onClick={() => onPush(o.order_no)} disabled={busy === o.order_no}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white disabled:opacity-50 whitespace-nowrap"
                            style={{ backgroundColor: "#dc2626" }} title="ส่งใบเบิกนี้ไป CTW">
                            <Send size={14} /> {busy === o.order_no ? "กำลังส่ง…" : "ส่งไป CTW"}
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted whitespace-nowrap" title="ต้องตัดสต๊อกก่อน">รอตัดสต๊อก</span>
                        ))}
                        {isEveKp && (!o.stock_issued_at ? (
                          <span className="text-[11px] text-muted whitespace-nowrap" title="ต้องตัดสต๊อกก่อน">รอตัดสต๊อก</span>
                        ) : !o.shipped_at ? (
                          <button onClick={() => onShip(o.order_no)} disabled={busy === o.order_no}
                            className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2 py-1 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50 whitespace-nowrap" title="ยืนยันส่งออกไปปลายทาง">
                            <Truck size={14} /> {busy === o.order_no ? "กำลังส่ง…" : "ส่งออก"}
                          </button>
                        ) : o.received_at ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 whitespace-nowrap" title={`ปลายทางรับครบ${o.received_by ? " · " + o.received_by : ""}`}>
                            <PackageCheck size={14} /> รับครบ
                          </span>
                        ) : (
                          <button onClick={() => setReceiptFor({ order_no: o.order_no, doc_no: o.doc_no ?? null })}
                            className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 whitespace-nowrap" title="ยืนยันปลายทางรับ (รับบางส่วนได้)">
                            <PackageCheck size={14} /> {(o.received_qty ?? 0) > 0 ? `รับเพิ่ม (${o.received_qty}/${o.total_qty})` : "ยืนยันรับ"}
                          </button>
                        ))}
                        <a href={`/print/pdf/${encodeURIComponent(o.order_no)}`} target="_blank" rel="noreferrer"
                          className="rounded-md p-1.5 text-muted hover:bg-brand-50 hover:text-brand-600" title="พิมพ์" aria-label="พิมพ์ใบเบิก">
                          <Printer size={16} />
                        </a>
                        <Link href={`${base}/${encodeURIComponent(o.order_no)}`}
                          className="rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink" title="แก้ไข" aria-label="แก้ไขใบเบิก">
                          <Pencil size={16} />
                        </Link>
                        <button onClick={() => onDelete(o.order_no)} disabled={busy === o.order_no}
                          className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600" title="ลบ" aria-label="ลบใบเบิก (ไปถังขยะ)">
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
      {receiptFor && (
        <WholesaleReceiptModal orderNo={receiptFor.order_no} docNo={receiptFor.doc_no}
          onClose={() => setReceiptFor(null)}
          onDone={() => { setReceiptFor(null); router.refresh(); }} />
      )}
    </div>
  );
}
