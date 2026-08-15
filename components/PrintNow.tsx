"use client";
import { useEffect } from "react";
import { Printer } from "lucide-react";

/**
 * ปุ่มพิมพ์ + auto-print สำหรับหน้า HTML print.
 * รอ document.fonts.ready ก่อน window.print() — กัน Safari พิมพ์ตัวหนังสือหาย/ว่าง
 * (แนวเดียวกับ CTW components/PrintNow.tsx). ตั้ง document.title = ชื่อไฟล์ Save-as-PDF.
 */
export default function PrintNow({ title, auto = true }: { title?: string; auto?: boolean }) {
  useEffect(() => {
    if (title) document.title = title;
    if (!auto) return;
    let done = false;
    const go = () => { if (done) return; done = true; window.print(); };
    // รอฟอนต์ให้พร้อมก่อนพิมพ์ (มี fallback timeout กันค้าง)
    const ready = (document as any).fonts?.ready as Promise<unknown> | undefined;
    if (ready) ready.then(() => setTimeout(go, 150));
    const t = setTimeout(go, 1200);
    return () => clearTimeout(t);
  }, [title, auto]);

  return (
    <button onClick={() => window.print()}
      className="no-print btn-primary fixed right-4 top-4 z-50 shadow-lg">
      <Printer size={16} /> พิมพ์
    </button>
  );
}
