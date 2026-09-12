"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wand2, RefreshCw } from "lucide-react";
import { recomputeCustomerTypes } from "@/lib/actions/orders";

/** ปุ่มแอดมิน: จัดประเภทลูกค้า (ใหม่/เก่า) + ซื้อครั้งที่
 *  fill = จัดเฉพาะที่ยังว่าง (ปลอดภัย) · all = จัดใหม่ทั้งหมด เรียงวันที่ ทับของเดิม (ลำดับถูก 100%) */
export default function RecomputeCustomerBtn() {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"fill" | "all" | "">("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const run = (mode: "fill" | "all") => {
    const ok = mode === "all"
      ? confirm("จัดใหม่ทั้งหมด — เรียงตามวันที่ใหม่ และ ทับข้อมูลเดิม (แม้ที่ระบุแล้ว)\nลำดับ 'ซื้อครั้งที่' จะถูก 100% แม้เคยคีย์ย้อนหลัง · ทำเฉพาะออร์เดอร์ที่มี username/เบอร์")
      : confirm("จัดเฉพาะออร์เดอร์ที่ยัง 'ไม่ระบุ' (ไม่ทับของเดิม) · กดซ้ำได้");
    if (!ok) return;
    setMsg(""); setBusy(mode);
    start(async () => {
      const r = await recomputeCustomerTypes(mode);
      setBusy("");
      if (r.ok) { setMsg(`✓ ${mode === "all" ? "จัดใหม่" : "จัด"} ${r.updated?.toLocaleString()} ออร์เดอร์`); router.refresh(); }
      else setMsg(`✗ ${r.error || "ไม่สำเร็จ"}`);
    });
  };

  return (
    <div className="flex items-center gap-2">
      {msg && <span className={`text-xs ${msg.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>{msg}</span>}
      <button type="button" onClick={() => run("fill")} disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-soft disabled:opacity-50">
        <Wand2 size={13} /> {busy === "fill" ? "กำลังจัด…" : "จัดที่ว่าง"}
      </button>
      <button type="button" onClick={() => run("all")} disabled={pending} title="เรียงตามวันที่ใหม่ + ทับของเดิม → ลำดับซื้อครั้งที่ถูก 100%"
        className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50">
        <RefreshCw size={13} /> {busy === "all" ? "กำลังจัดใหม่…" : "จัดใหม่ทั้งหมด"}
      </button>
    </div>
  );
}
