"use client";
import { useEffect, useState } from "react";

// ปุ่มสลับขนาดตัวอักษรทั้งระบบ — ก / กก / กกก
// เก็บค่าไว้ในเครื่อง (localStorage) แยกต่อผู้ใช้/เครื่อง แล้วตั้ง data-fontsize บน <html>
// (globals.css แมป data-fontsize → font-size ฐาน · ค่าเริ่มต้น = md 17px)
const LEVELS = [
  { key: "sm", label: "ก", title: "เล็ก (16px)", fs: "12px" },
  { key: "md", label: "กก", title: "กลาง (17px)", fs: "14px" },
  { key: "lg", label: "กกก", title: "ใหญ่ (19px)", fs: "16px" },
] as const;

export default function FontSizeToggle() {
  const [level, setLevel] = useState<string>("md");

  useEffect(() => {
    try {
      const v = localStorage.getItem("sf_fontsize");
      if (v === "sm" || v === "md" || v === "lg") setLevel(v);
    } catch {}
  }, []);

  function apply(key: string) {
    setLevel(key);
    try { localStorage.setItem("sf_fontsize", key); } catch {}
    document.documentElement.setAttribute("data-fontsize", key);
  }

  return (
    <div className="mb-2 flex items-center gap-2 px-2">
      <span className="text-[11px] text-faint">ขนาดตัวอักษร</span>
      <div className="ml-auto flex overflow-hidden rounded-md border border-line" role="group" aria-label="ขนาดตัวอักษร">
        {LEVELS.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => apply(l.key)}
            title={l.title}
            aria-pressed={level === l.key}
            className={`px-2 py-0.5 leading-none transition-colors ${
              level === l.key ? "bg-soft font-semibold text-ink" : "text-faint hover:bg-soft hover:text-muted"
            }`}
            style={{ fontSize: l.fs }}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
