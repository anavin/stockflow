"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { receiveMaterial, issueMaterial, adjustMaterial, type ItemDesc } from "@/lib/actions/supply";
import { Plus, Minus } from "lucide-react";

/** คงเหลือ + ปุ่มรับเข้า/เบิก + ช่องปรับยอด (นับได้จริง) ต่อ 1 รายการ */
export default function MaterialControls({ desc, qty, unit = "ชิ้น", canEdit }: { desc: ItemDesc; qty: number; unit?: string; canEdit: boolean }) {
  const router = useRouter();
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const low = qty <= 10;

  async function receive() {
    const a = prompt(`รับเข้า "${desc.label}" — จำนวน (${unit})?`); if (a == null || a.trim() === "") return;
    setBusy(true); const r = await receiveMaterial(desc, Number(a)); setBusy(false);
    if (!r.ok) { alert(r.error); return; } router.refresh();
  }
  async function issue() {
    const a = prompt(`เบิก/จ่ายออก "${desc.label}" — จำนวน (${unit})?\nคงเหลือ ${qty.toLocaleString()}`); if (a == null || a.trim() === "") return;
    const note = prompt("หมายเหตุ (เบิกไปทำอะไร) — เว้นว่างได้") ?? "";
    setBusy(true); const r = await issueMaterial(desc, Number(a), note); setBusy(false);
    if (!r.ok) { alert(r.error); return; } router.refresh();
  }
  async function saveAdjust() {
    if (val === "" || Number(val) === qty) { setVal(""); return; }
    setBusy(true); const r = await adjustMaterial(desc, Number(val)); setBusy(false);
    if (!r.ok) { alert(r.error); return; } setVal(""); router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className={`text-right font-semibold tabular-nums ${qty < 0 ? "text-red-600" : low ? "text-amber-600" : "text-ink"}`}>{qty.toLocaleString()}</span>
      <span className="w-8 text-xs text-faint">{unit}</span>
      {canEdit && (
        <>
          <button onClick={receive} disabled={busy} className="rounded-md p-1 text-green-600 hover:bg-green-50 disabled:opacity-50" title="รับเข้า"><Plus size={15} /></button>
          <button onClick={issue} disabled={busy} className="rounded-md p-1 text-red-500 hover:bg-red-50 disabled:opacity-50" title="เบิก / จ่ายออก"><Minus size={15} /></button>
          <input type="number" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveAdjust(); }}
            className="input h-8 w-16 py-0 text-right text-xs" placeholder="นับ" title="นับได้จริง → Enter เพื่อปรับยอด" />
        </>
      )}
    </div>
  );
}
