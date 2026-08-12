"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lookupPostcode, type PostcodeHit } from "@/lib/actions/orders";
import { MapPin, Search } from "lucide-react";

/** ช่องรหัสไปรษณีย์ที่ค้นได้ทั้งประเทศ — พิมพ์รหัส → เลือกตำบล/อำเภอ/จังหวัด */
export default function PostcodeSearch({
  value, onChange, onPick, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (hit: PostcodeHit) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [list, setList] = useState<PostcodeHit[]>([]);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);
  function reposition() {
    const el = wrapRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: Math.max(360, r.width) });
  }
  useLayoutEffect(() => { if (open) reposition(); }, [open, list]);
  useEffect(() => {
    if (!open) return;
    const h = () => reposition();
    window.addEventListener("scroll", h, true); window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); };
  }, [open]);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function handleChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 5);
    onChange(digits);
    if (timer.current) clearTimeout(timer.current);
    if (digits.length < 3) { setList([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const res = await lookupPostcode(digits);
      setList(res); setOpen(res.length > 0);
    }, 200);
  }
  function pick(h: PostcodeHit) { onPick(h); setOpen(false); }

  const label = (h: PostcodeHit) => {
    const bkk = h.province === "กรุงเทพมหานคร";
    return { t: (bkk ? "แขวง" : "ต.") + h.subdistrict, a: (bkk ? "เขต" : "อ.") + h.district };
  };

  const popup = open && rect && list.length > 0 && (
    <div ref={popRef} style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 60 }}
      className="rounded-lg border border-line bg-white shadow-card">
      <div className="border-b border-line px-3 py-1.5 text-[11px] font-medium text-muted">
        <MapPin size={12} className="mr-1 inline" /> เลือกตำบล / อำเภอ — คลิกเพื่อเติมที่อยู่
      </div>
      <ul className="max-h-72 overflow-auto py-1">
        {list.map((h, i) => {
          const l = label(h);
          return (
            <li key={i}>
              <button type="button" onClick={() => pick(h)} className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-soft">
                <span className="min-w-0 text-sm leading-snug">
                  <span className="font-medium text-ink">{l.t}</span> <span className="text-muted">{l.a}</span>
                  <span className="block text-xs text-muted">{h.province}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-faint">{h.postcode}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input inputMode="numeric" className="input pl-9" value={value} placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (list.length > 0) setOpen(true); }} autoComplete="off" />
      </div>
      {mounted && popup ? createPortal(popup, document.body) : null}
    </div>
  );
}
