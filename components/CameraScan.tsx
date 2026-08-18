"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { X, ScanLine, Check, AlertTriangle, XCircle, Loader2 } from "lucide-react";

/** ผลการสแกน 1 ชิ้น — หน้าที่เรียกใช้คืนค่านี้กลับมาให้กล้องแจ้ง user
 *  ok = สำเร็จ · dup = ซ้ำ (เคยสแกนแล้ว) · error = ไม่สำเร็จ (ต้องกดรับทราบก่อนสแกนต่อ) */
export type ScanFeedback = { status: "ok" | "dup" | "error"; title: string; detail?: string };
type ScanReturn = void | ScanFeedback | Promise<void | ScanFeedback>;

/** เปิดกล้อง (หลัง) อ่านบาร์โค้ด แล้วส่งค่ากลับผ่าน onScan.
 *  continuous=true → สแกนต่อเนื่อง: หลังอ่านได้จะ "หยุดรับ → แจ้งผล → ค่อยสแกนต่อ"
 *    · ok/ซ้ำ = ต่ออัตโนมัติ · error = ต้องกด "รับทราบ" ก่อน (บังคับหยุด แยกกล่อง)
 *  onScan คืน ScanFeedback เพื่อบอกกล้องว่าจะโชว์ผลแบบไหน (ไม่คืน = ถือว่า ok) */
export default function CameraScan({
  onScan, onClose, continuous = false,
  title = "เล็งบาร์โค้ดบนใบเบิก",
  hint = "วางบาร์โค้ด Order No. ให้อยู่ในกรอบ — ระบบจะตัดสต๊อกอัตโนมัติเมื่ออ่านได้",
}: { onScan: (code: string) => ScanReturn; onClose: () => void; continuous?: boolean; title?: string; hint?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [counts, setCounts] = useState({ ok: 0, dup: 0, error: 0 });
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ fb: ScanFeedback; code: string } | null>(null);
  const doneRef = useRef(false);            // single mode: ยิงครั้งเดียว
  const pausedRef = useRef(false);          // continuous: กำลังแจ้งผล → หยุดรับโค้ดใหม่
  const cooldownRef = useRef(0);            // ยังไม่รับโค้ดใหม่จนถึงเวลานี้ (กันอ่านต่อทันทีหลังต่อ)
  const lastRef = useRef<{ code: string; t: number }>({ code: "", t: 0 });
  const timerRef = useRef<any>(0);          // ตัวจับเวลาต่ออัตโนมัติ (ok/dup)
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;   // อัปเดตทุก render โดยไม่ทำให้ effect restart (กล้องไม่ค้าง/รีสตาร์ท)

  // กลับไปสแกนต่อ (เคลียร์ผล + หน่วงกันอ่านซ้ำทันที)
  function resume() {
    clearTimeout(timerRef.current);
    setResult(null); setChecking(false);
    lastRef.current = { code: "", t: 0 };
    cooldownRef.current = Date.now() + 900;
    pausedRef.current = false;
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

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
      .decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current!, (res, _e, ctrl) => {
        controls = ctrl;
        if (!res) return;
        const text = res.getText();
        if (continuous) {
          if (pausedRef.current || Date.now() < cooldownRef.current) return;   // กำลังแจ้งผล/หน่วง → ข้าม
          const t = Date.now();
          if (text === lastRef.current.code && t - lastRef.current.t < 1500) return;   // กันอ่านโค้ดเดิมรัวๆ
          lastRef.current = { code: text, t };
          // หยุดรับ → กำลังตรวจ → รอผลจริงจากหน้าเจ้าของ → แจ้งผล
          pausedRef.current = true;
          try { navigator.vibrate?.(30); } catch { /* ignore */ }
          setChecking(true);
          Promise.resolve(onScanRef.current(text)).then((r) => {
            const fb: ScanFeedback = r && typeof r === "object" ? r : { status: "ok", title: "สำเร็จ" };
            setChecking(false);
            setResult({ fb, code: text });
            setCounts((c) => ({ ...c, [fb.status]: c[fb.status] + 1 }));
            if (fb.status === "error") return;                          // error = รอกดรับทราบ
            timerRef.current = setTimeout(resume, fb.status === "dup" ? 1500 : 1000);   // ok/ซ้ำ = ต่อเอง
          }).catch(() => {
            setChecking(false);
            setResult({ fb: { status: "error", title: "ผิดพลาด", detail: "ลองสแกนใหม่" }, code: text });
            setCounts((c) => ({ ...c, error: c.error + 1 }));
          });
        } else if (!doneRef.current) {
          doneRef.current = true;
          try { navigator.vibrate?.(40); } catch { /* ignore */ }
          ctrl.stop();
          onScanRef.current(text);
        }
      })
      .then((c) => { controls = c; if (stopped) c.stop(); })
      .catch((e) => setErr(cameraErr(e)));

    return () => { stopped = true; try { controls?.stop(); } catch { /* ignore */ } };
  }, [continuous]);

  const total = counts.ok + counts.dup + counts.error;

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

        {/* ตัวนับสรุป — แยกตามผลจริง (ไม่ใช่นับดิบ) */}
        {continuous && total > 0 && !result && !checking && (
          <div className="absolute inset-x-0 top-3 flex justify-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-green-600/90 px-2.5 py-1 text-white">✓ {counts.ok}</span>
            {counts.dup > 0 && <span className="rounded-full bg-amber-500/90 px-2.5 py-1 text-white">⚠ {counts.dup}</span>}
            {counts.error > 0 && <span className="rounded-full bg-red-600/90 px-2.5 py-1 text-white">✕ {counts.error}</span>}
          </div>
        )}

        {/* กำลังตรวจ */}
        {checking && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 text-white/90">
            <Loader2 size={40} className="animate-spin" />
            <div className="text-sm">กำลังตรวจ…</div>
          </div>
        )}

        {/* ผลการสแกน — เต็มจอ ชัด ก่อนสแกนต่อ */}
        {result && (() => {
          const s = result.fb.status;
          const tone = s === "ok" ? "bg-green-600/95" : s === "dup" ? "bg-amber-500/95" : "bg-red-600/95";
          const Icon = s === "ok" ? Check : s === "dup" ? AlertTriangle : XCircle;
          return (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white ${tone}`}>
              <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-white/20"><Icon size={38} strokeWidth={2.5} /></div>
              <div className="text-lg font-extrabold">{result.fb.title}</div>
              <div className="rounded-lg bg-black/20 px-3 py-1 font-mono text-sm">{result.code}</div>
              {result.fb.detail && <div className="max-w-[26ch] text-sm opacity-90">{result.fb.detail}</div>}
              {s === "error" ? (
                <button onClick={resume} className="mt-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-ink active:scale-[.98]">
                  รับทราบ แล้วสแกนต่อ
                </button>
              ) : (
                <div className="mt-1 flex items-center gap-1.5 text-xs opacity-80"><Loader2 size={12} className="animate-spin" /> ต่ออัตโนมัติ…</div>
              )}
            </div>
          );
        })()}

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
