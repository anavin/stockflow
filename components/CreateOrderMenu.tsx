"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, ChevronDown } from "lucide-react";

/** ปุ่มสร้างใบเบิกบนหน้าหลัก — มีแพลตฟอร์มเดียว=ปุ่มตรง · หลายแพลตฟอร์ม=เลือกแพลตฟอร์มก่อน */
export default function CreateOrderMenu({ platforms }: { platforms: { code: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (platforms.length <= 1) {
    const p = platforms[0];
    return (
      <Link href={p ? `/${p.code.toLowerCase()}/new` : "/shopee/new"} className="btn-primary">
        <PlusCircle size={16} /> สร้างใบเบิก
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn-primary">
        <PlusCircle size={16} /> สร้างใบเบิก <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-card">
          <div className="px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-faint">เลือกแพลตฟอร์ม</div>
          {platforms.map((p) => (
            <Link key={p.code} href={`/${p.code.toLowerCase()}/new`} onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-ink hover:bg-soft">
              <PlusCircle size={14} className="text-brand" /> {p.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
