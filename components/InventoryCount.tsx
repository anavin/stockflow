"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, FileUp, Check, AlertTriangle, ArrowRight } from "lucide-react";

type Preview = {
  total: number; changed: number;
  bySheet: { sheet: string; changed: number }[];
  preview: { sheet: string; name: string; from: number; to: number }[];
  invalid: string[];
};

export default function InventoryCount({ canUpload }: { canUpload: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ applied: number; changed: number } | null>(null);

  async function doPreview(f: File) {
    setBusy(true); setErr(""); setPreview(null); setDone(null);
    const fd = new FormData(); fd.set("file", f); fd.set("mode", "preview");
    try {
      const r = await fetch("/api/inventory/import", { method: "POST", body: fd });
      const j = await r.json();
      if (!j.ok) { setErr(j.error || "อ่านไฟล์ไม่สำเร็จ"); return; }
      setPreview(j);
    } catch { setErr("อัปโหลดไม่สำเร็จ"); } finally { setBusy(false); }
  }
  async function apply() {
    if (!file) return;
    setBusy(true); setErr("");
    const fd = new FormData(); fd.set("file", file); fd.set("mode", "apply");
    try {
      const r = await fetch("/api/inventory/import", { method: "POST", body: fd });
      const j = await r.json();
      if (!j.ok) { setErr(j.error || "อัปเดตไม่สำเร็จ"); return; }
      setDone({ applied: j.applied, changed: j.changed }); setPreview(null); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch { setErr("อัปเดตไม่สำเร็จ"); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {!canUpload && (
        <div className="alert-warn flex items-center gap-2">
          <AlertTriangle size={16} /> ดูขั้นตอนได้ แต่ <b>เฉพาะแอดมิน</b>เท่านั้นที่ดาวน์โหลดเทมเพลต / อัปโหลดไฟล์อัปเดตยอดได้
        </div>
      )}
      {/* ขั้นตอน */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">ขั้นตอน</h2>
        <ol className="space-y-3 text-sm text-muted">
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">1</span>
            <div className="flex-1">
              <span className="text-ink">ดาวน์โหลดเทมเพลต</span> — ไฟล์ Excel เติม SKU ทุกตัวให้แล้ว (4 ชีต: สำเร็จรูป/น้ำหอม/สติ๊กเกอร์/ขวด)
              <div className="mt-1.5">{canUpload
                ? <a href="/api/inventory/template" className="btn-primary inline-flex text-sm"><FileDown size={15} /> ดาวน์โหลดเทมเพลต</a>
                : <span className="btn-primary pointer-events-none inline-flex text-sm opacity-40"><FileDown size={15} /> ดาวน์โหลดเทมเพลต</span>}</div>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">2</span>
            <div>กรอกช่อง <b className="text-amber-700">“นับได้จริง”</b> เฉพาะรายการที่นับ — เว้นว่าง = ไม่แตะยอดเดิม · <b>ห้ามแก้คอลัมน์ “รหัส”</b></div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">3</span>
            <div className="flex-1">
              อัปโหลดไฟล์ที่กรอกแล้ว → ดูตัวอย่างก่อน แล้วยืนยัน
              <div className="mt-1.5">
                <label className={`btn-ghost inline-flex text-sm ${canUpload ? "cursor-pointer" : "pointer-events-none opacity-40"}`}>
                  <FileUp size={15} /> {file ? file.name : "เลือกไฟล์ที่กรอกแล้ว…"}
                  <input ref={fileRef} type="file" accept=".xlsx" className="hidden" disabled={!canUpload}
                    onChange={(e) => { const f = e.target.files?.[0] || null; setFile(f); if (f) doPreview(f); }} />
                </label>
              </div>
            </div>
          </li>
        </ol>
      </div>

      {err && <div className="alert-error flex items-center gap-2"><AlertTriangle size={16} /> {err}</div>}

      {done && (
        <div className="alert-success flex items-center gap-2">
          <Check size={16} /> อัปเดตสำเร็จ — ตั้งยอด {done.applied.toLocaleString()} รายการ (เปลี่ยนจริง {done.changed.toLocaleString()}) · ลงประวัติแล้ว
        </div>
      )}

      {busy && !preview && <p className="text-center text-sm text-muted">กำลังอ่านไฟล์…</p>}

      {preview && (
        <div className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-ink">ตัวอย่างก่อนอัปเดต</div>
              <div className="text-xs text-muted">
                กรอกทั้งหมด {preview.total.toLocaleString()} · <b className="text-amber-700">เปลี่ยนยอด {preview.changed.toLocaleString()}</b>
                {preview.bySheet.length > 0 && <> · {preview.bySheet.map((b) => `${b.sheet} ${b.changed}`).join(" · ")}</>}
              </div>
            </div>
            <button onClick={apply} disabled={busy || preview.changed === 0}
              className="btn-success">
              {busy ? "กำลังอัปเดต…" : `ยืนยันอัปเดต (${preview.changed})`}
            </button>
          </div>

          {preview.invalid.length > 0 && (
            <div className="alert-warn mb-3 text-xs">
              ข้ามแถวผิดรูปแบบ {preview.invalid.length}: {preview.invalid.slice(0, 5).join(" · ")}{preview.invalid.length > 5 ? " …" : ""}
            </div>
          )}
          {preview.changed === 0 ? (
            <p className="py-8 text-center text-sm text-muted">ไม่มีรายการที่เปลี่ยนยอด (ทุกช่องเท่าเดิม หรือยังไม่ได้กรอก)</p>
          ) : (
            <div className="max-h-[24rem] overflow-y-auto rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-soft text-left text-xs text-muted">
                  <tr><th className="px-3 py-2">หมวด</th><th className="px-3 py-2">รายการ</th><th className="px-3 py-2 text-right">เดิม</th><th className="px-3 py-2 text-center"></th><th className="px-3 py-2 text-right">ใหม่</th></tr>
                </thead>
                <tbody>
                  {preview.preview.map((c, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-3 py-1.5 text-xs text-muted">{c.sheet}</td>
                      <td className="px-3 py-1.5 text-ink">{c.name}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted">{c.from.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-center text-faint"><ArrowRight size={12} className="inline" /></td>
                      <td className={`px-3 py-1.5 text-right font-semibold tabular-nums ${c.to > c.from ? "text-green-700" : "text-red-600"}`}>{c.to.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.changed > preview.preview.length && <p className="px-3 py-2 text-center text-xs text-faint">แสดง {preview.preview.length} จาก {preview.changed} รายการ</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
