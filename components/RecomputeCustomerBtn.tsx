"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { recomputeCustomerTypes } from "@/lib/actions/orders";

/** ปุ่มแอดมิน: จัดประเภทลูกค้า (ใหม่/เก่า) ย้อนหลังให้ออร์เดอร์ที่มี username แต่ยัง "ไม่ระบุ" */
export default function RecomputeCustomerBtn() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const run = () => {
    if (!confirm("จัดประเภทลูกค้า (ใหม่/เก่า) + ซื้อครั้งที่ ย้อนหลัง\nเฉพาะออร์เดอร์ที่มี username แต่ยังไม่ระบุ · ไม่ทับข้อมูลที่ระบุแล้ว · กดซ้ำได้")) return;
    setMsg("");
    start(async () => {
      const r = await recomputeCustomerTypes();
      if (r.ok) { setMsg(`✓ จัดแล้ว ${r.updated?.toLocaleString()} ออร์เดอร์`); router.refresh(); }
      else setMsg(`✗ ${r.error || "ไม่สำเร็จ"}`);
    });
  };

  return (
    <div className="flex items-center gap-2">
      {msg && <span className={`text-xs ${msg.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>{msg}</span>}
      <button type="button" onClick={run} disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-soft disabled:opacity-50">
        <Wand2 size={13} /> {pending ? "กำลังจัด…" : "จัดประเภทย้อนหลัง"}
      </button>
    </div>
  );
}
