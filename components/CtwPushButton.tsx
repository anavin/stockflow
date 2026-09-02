"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { pushToCtw } from "@/lib/actions/ctw";
import { Send, CheckCircle2 } from "lucide-react";

/** ปุ่ม "ส่งไป CTW" — โชว์บนใบเบิก CTW ที่ตัดสต๊อกแล้ว · ส่งครบแล้วโชว์สถานะ */
export default function CtwPushButton({ orderNo, issued, pushedAt }: { orderNo: string; issued: boolean; pushedAt: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (pushedAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1.5 text-sm font-medium text-purple-700">
        <CheckCircle2 size={16} /> ส่งไป CTW แล้ว
      </span>
    );
  }
  if (!issued) return null;   // ต้องตัดสต๊อกก่อน

  async function go() {
    if (!confirm(`ส่งใบเบิก ${orderNo} ไปยังระบบ CTW?\n\nระบบ CTW จะรับรายการ + SKU ไปดำเนินการต่อ`)) return;
    setBusy(true);
    const res = await pushToCtw(orderNo);
    setBusy(false);
    if (!res.ok) { alert(res.error || "ส่งไม่สำเร็จ"); return; }
    router.refresh();
  }
  return (
    <button onClick={go} disabled={busy}
      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      style={{ backgroundColor: "#9333ea" }}>
      <Send size={16} /> {busy ? "กำลังส่ง…" : "ส่งไป CTW"}
    </button>
  );
}
