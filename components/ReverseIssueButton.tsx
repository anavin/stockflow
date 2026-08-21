"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { reverseIssue } from "@/lib/actions/stock";
import { Undo2 } from "lucide-react";

/** ยกเลิกการตัดสต๊อก (admin) — คืนสต๊อก + ใบกลับไปสถานะ "รอตัดสต๊อก" ให้แก้ไข/ตัดใหม่ได้ */
export default function ReverseIssueButton({ orderNo, platform }: { orderNo: string; platform?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!confirm(`ยกเลิกการตัดสต๊อกของ ${orderNo}?\n\nสต๊อกจะถูกคืนกลับ และใบนี้จะกลับไปสถานะ "รอตัดสต๊อก" — แก้ไขใบเบิกหรือสแกนตัดใหม่ได้`)) return;
    setBusy(true);
    const res = await reverseIssue(orderNo);
    setBusy(false);
    if (!res.ok) { alert(res.error); return; }
    // พาไปหน้าใบเบิกนั้น (ตามแพลตฟอร์มของออเดอร์) → แก้ไข หรือกดปุ่ม "ตัดสต๊อก" ใหม่ได้ในที่เดียว
    router.push(`/${(platform || "Shopee").toLowerCase()}/${encodeURIComponent(orderNo)}`);
  }

  return (
    <button onClick={onClick} disabled={busy}
      className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      title="ยกเลิกการตัด (คืนสต๊อก) — แก้ไข/ตัดใหม่ได้">
      <Undo2 size={16} />
    </button>
  );
}
