"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { X, ScanLine } from "lucide-react";

/** เปิดกล้อง (หลัง) อ่านบาร์โค้ด แล้วส่งค่ากลับผ่าน onScan.
 *  continuous=true → สแกนต่อเนื่อง (ยิงหลายชิ้นรวดเดียว, กันอ่านโค้ดเดิมซ้ำ) — ต้องกดปิดเอง. */
export default function CameraScan({
  onScan, onClose, continuous = false,
  title = "เล็งบาร์โค้ดบนใบเบิก",
  hint = "วางบาร์โค้ด Order No. ให้อยู่ในกรอบ — ระบบจะตัดสต๊อกอัตโนมัติเมื่ออ่านได้",
}: { onScan: (code: string) => void; onClose: () => void; continuous?: boolean; title?: string; hint?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [last, setLast] = useState("");
  const doneRef = useRef(false);
  const lastRef = useRef<{ code: string; t: number }>({ code: "", t: 0 });
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;   // อัปเดตทุก render โดยไม่ทำให้ effect restart (กล้องไม่ค้าง/รีสตาร์ท)

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_39, BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE, BarcodeFormat.EAN_13,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);
    let controls: IScannerControls | undefined;
    let stopped = false;

    reader
      .decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current!, (result, _e, ctrl) => {
        controls = ctrl;
        if (!result) return;
        const text = result.getText();
        if (continuous) {
          const t = Date.now();
          if (text === lastRef.current.code && t - lastRef.current.t < 1500) return;   // กันอ่านโค้ดเดิมรัวๆ
          lastRef.current = { code: text, t };
          try { navigator.vibrate?.(60); } catch { /* ignore */ }
          setCount((c) => c + 1); setLast(text);
          onScanRef.current(text);
        } else if (!doneRef.current) {
          doneRef.current = true;
          try { navigator.vibrate?.(80); } catch { /* ignore */ }
          ctrl.stop();
          onScanRef.current(text);
        }
      })
      .then((c) => { controls = c; if (stopped) c.stop(); })
      .catch((e) => setErr(cameraErr(e)));

    return () => { stopped = true; try { controls?.stop(); } catch { /* ignore */ } };
  }, [continuous]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 text-white">
        <span className="flex items-center gap-2 text-sm font-medium"><ScanLine size={16} /> {title}</span>
        <button onClick={onClose} aria-label="ปิด" className="rounded-full bg-white/15 p-2 hover:bg-white/25"><X size={18} /></button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-28 w-4/5 max-w-sm rounded-xl border-2 border-white/90" style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,.35)" }} />
        </div>
        {continuous && count > 0 && (
          <div className="absolute inset-x-4 top-4 rounded-lg bg-green-600/90 px-3 py-2 text-center text-sm font-medium text-white">
            สแกนแล้ว {count} ชิ้น · ล่าสุด <span className="font-mono">{last}</span>
          </div>
        )}
        {err && (
          <div className="absolute inset-x-4 bottom-6 rounded-lg bg-white p-4 text-center text-sm text-red-600">{err}</div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-4">
        <p className="text-xs text-white/70">{hint}</p>
        {continuous && <button onClick={onClose} className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-medium text-ink">เสร็จสิ้น</button>}
      </div>
    </div>
  );
}

function cameraErr(e: any): string {
  const n = e?.name || "";
  if (n === "NotAllowedError" || n === "SecurityError") return "ไม่ได้อนุญาตให้ใช้กล้อง — อนุญาตในเบราว์เซอร์แล้วลองใหม่";
  if (n === "NotFoundError" || n === "OverconstrainedError") return "ไม่พบกล้องบนอุปกรณ์นี้";
  return (e?.message || "เปิดกล้องไม่ได้") + " (ต้องใช้ผ่าน https)";
}
