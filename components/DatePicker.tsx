"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Large custom date picker (Thai months + พ.ศ. year). Value is an ISO
 * "YYYY-MM-DD" string (Gregorian). The popup renders in a portal with fixed
 * positioning so it's never clipped and the calendar cells are big & tappable.
 */
const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const TH_DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function parseISO(v?: string | null): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDisplay(v?: string | null): string {
  const d = parseISO(v || "");
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "เลือกวันที่",
  className = "",
}: {
  value?: string | null;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const selected = parseISO(value || "");
  const today = new Date();
  const [view, setView] = useState(() => selected ?? today);

  useEffect(() => setMounted(true), []);
  // keep the visible month in sync when the value changes externally
  useEffect(() => { if (selected) setView(selected); /* eslint-disable-next-line */ }, [value]);

  function reposition() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(320, r.width);
    let left = r.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    setRect({ top: r.bottom + 6, left, width });
  }
  useLayoutEffect(() => { if (open) reposition(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = () => reposition();
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); };
  }, [open]);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const y = view.getFullYear(), m = view.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isSameDay = (a: Date | null, dd: number) =>
    !!a && a.getFullYear() === y && a.getMonth() === m && a.getDate() === dd;

  function pick(d: number) {
    onChange(toISO(new Date(y, m, d)));
    setOpen(false);
  }

  const popup = open && rect && (
    <div
      ref={popRef}
      style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 60 }}
      className="rounded-xl border border-line bg-white p-3 shadow-card"
    >
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="rounded-lg p-2 text-muted hover:bg-soft" onClick={() => setView(new Date(y, m - 1, 1))}>
          <ChevronLeft size={18} />
        </button>
        <div className="text-sm font-semibold text-ink">{TH_MONTHS[m]} {y + 543}</div>
        <button type="button" className="rounded-lg p-2 text-muted hover:bg-soft" onClick={() => setView(new Date(y, m + 1, 1))}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {TH_DOW.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-faint">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const sel = isSameDay(selected, d);
          const isToday = isSameDay(today, d);
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(d)}
              className={`flex h-10 items-center justify-center rounded-lg text-sm transition-colors
                ${sel ? "bg-brand font-semibold text-white" : isToday ? "bg-brand-50 text-brand-600" : "text-ink hover:bg-soft"}`}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
        <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => { onChange(toISO(today)); setView(today); setOpen(false); }}>
          วันนี้
        </button>
        {value && (
          <button type="button" className="text-xs text-muted hover:underline" onClick={() => { onChange(""); setOpen(false); }}>
            ล้าง
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex w-full items-center justify-between gap-2 text-left"
      >
        <span className={value ? "text-ink" : "text-faint"}>{fmtDisplay(value) || placeholder}</span>
        <Calendar size={16} className="shrink-0 text-faint" />
      </button>
      {mounted && popup ? createPortal(popup, document.body) : null}
    </div>
  );
}
