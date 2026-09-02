"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetOrderIssue } from "@/lib/actions/reset";
import { RotateCcw } from "lucide-react";

/** รีเซ็ตใบเบิกกลับ "รอตัดสต๊อก" คลิกเดียว (แอดมิน) — สำหรับใบที่ตัน (ส่งแล้ว/มีการคืน)
 *  ทำ 3 ขั้นให้เอง: ยกเลิกการคืน → ยกเลิกการส่ง → ยกเลิกการตัดสต๊อก (คืนสต๊อกครบ) */
export default function ResetIssueButton({ orderNo, platform }: { orderNo: string; platform?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!confirm(
      `รีเซ็ตใบเบิก ${orderNo} กลับสถานะ "รอตัดสต๊อก"?\n\n` +
      `ระบบจะ: ยกเลิกการคืน (ถ้ามี) → ยกเลิกการส่ง → คืนสต๊อก/SKU/ถุงทั้งหมด\n` +
      `แล้วตัดสต๊อกใหม่ได้เลย (ใช้ตอนทดสอบ/แก้ที่ตันเท่านั้น)`)) return;
    setBusy(true);
    const res = await resetOrderIssue(orderNo);
    setBusy(false);
    if (!res.ok) { alert(res.error); return; }
    router.push(`/${(platform || "Shopee").toLowerCase()}/${encodeURIComponent(orderNo)}`);
    router.refresh();
  }

  return (
    <button onClick={onClick} disabled={busy}
      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
      title="รีเซ็ตกลับ 'รอตัดสต๊อก' (ยกเลิกการคืน+การส่ง+คืนสต๊อก) — สำหรับแอดมิน">
      <RotateCcw size={15} /> {busy ? "กำลังรีเซ็ต…" : "รีเซ็ตใบเบิก"}
    </button>
  );
}
