"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

/**
 * Searchable single-select combobox. Free-typing is allowed (allowCustom),
 * so it works both as a strict dropdown and as a "type or pick" field.
 *
 * The dropdown is rendered in a portal with fixed positioning so it floats
 * above everything and is never clipped by an ancestor's overflow (e.g. the
 * items table card). It repositions on scroll/resize while open.
 */
export default function Combobox({
  value,
  onChange,
  options,
  placeholder = "เลือก…",
  allowCustom = true,
  disabled = false,
  invalid = false,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  allowCustom?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function reposition() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = () => reposition();
    window.addEventListener("scroll", handler, true); // capture → catches scrolls in any container
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const qq = query.trim().toLowerCase();
    if (!qq) return options.slice(0, 200);
    return options.filter((o) => o.toLowerCase().includes(qq)).slice(0, 200);
  }, [options, query]);

  useEffect(() => setHi(0), [query, open]);
  // reset the search text every time the popup closes so reopening is clean
  useEffect(() => { if (!open) setQuery(""); }, [open]);

  function commit(v: string) {
    onChange(v);
    setQuery("");
    setOpen(false);
  }

  const popup = open && rect && (
    <div
      ref={popRef}
      style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 60 }}
      className="rounded-lg border border-line bg-white shadow-card"
    >
      <div className="border-b border-line p-2">
        <input
          autoFocus
          className="input py-1.5 text-sm"
          placeholder="พิมพ์เพื่อค้นหา…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, filtered.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[hi]) commit(filtered[hi]);
              else if (allowCustom && query.trim()) commit(query.trim());
            } else if (e.key === "Escape") { setOpen(false); }
          }}
        />
      </div>
      <ul className="max-h-60 overflow-auto py-1">
        {filtered.length === 0 && !allowCustom && (
          <li className="px-3 py-2 text-sm text-faint">ไม่พบ</li>
        )}
        {allowCustom && query.trim() && !options.some((o) => o.toLowerCase() === query.trim().toLowerCase()) && (
          <li>
            <button type="button" className="flex w-full items-center px-3 py-2 text-left text-sm text-brand-600 hover:bg-soft"
              onClick={() => commit(query.trim())}>
              ใช้ “{query.trim()}”
            </button>
          </li>
        )}
        {filtered.map((o, i) => (
          <li key={o}>
            <button
              type="button"
              onMouseEnter={() => setHi(i)}
              onClick={() => commit(o)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${i === hi ? "bg-soft" : ""} hover:bg-soft`}
            >
              <span className="truncate">{o}</span>
              {o === value && <Check size={14} className="text-brand" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`input flex w-full items-center justify-between gap-2 text-left disabled:opacity-60 ${invalid ? "border-red-400 ring-2 ring-red-100" : ""}`}
      >
        <span className={value ? "truncate text-ink" : "truncate text-faint"}>{value || placeholder}</span>
        <ChevronDown size={16} className="shrink-0 text-faint" />
      </button>
      {mounted && popup ? createPortal(popup, document.body) : null}
    </div>
  );
}
