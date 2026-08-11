"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { searchCustomers, type CustomerSuggestion } from "@/lib/actions/orders";
import { User, MapPin, Sparkles } from "lucide-react";

/**
 * Text input with existing-customer autocomplete. As the user types (debounced),
 * it searches orders by username/phone/receiver and shows matching customers.
 * Picking one calls onPick so the form can auto-fill address + repeat-customer info.
 */
export default function CustomerSuggest({
  value,
  onChange,
  onPick,
  placeholder,
  type = "text",
  invalid = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (c: CustomerSuggestion) => void;
  placeholder?: string;
  type?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [list, setList] = useState<CustomerSuggestion[]>([]);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  function reposition() {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: Math.max(320, r.width) });
  }
  useLayoutEffect(() => { if (open) reposition(); }, [open, list]);
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
      if (wrapRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function handleChange(v: string) {
    onChange(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) { setList([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const res = await searchCustomers(v);
      setList(res);
      setOpen(res.length > 0);
    }, 250);
  }

  function pick(c: CustomerSuggestion) {
    onPick(c);
    setOpen(false);
  }

  const popup = open && rect && list.length > 0 && (
    <div ref={popRef} style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 60 }}
      className="rounded-lg border border-line bg-white shadow-card">
      <div className="border-b border-line px-3 py-1.5 text-[11px] font-medium text-muted">
        <User size={12} className="mr-1 inline" /> ลูกค้าเดิมในระบบ — คลิกเพื่อเติมข้อมูล
      </div>
      <ul className="max-h-72 overflow-auto py-1">
        {list.map((c, i) => (
          <li key={i}>
            <button type="button" onClick={() => pick(c)} className="w-full px-3 py-2 text-left hover:bg-soft">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{c.receiver || c.username || "-"}</span>
                <span className="chip bg-brand-50 text-brand-600">ซื้อมาแล้ว {c.total_orders} ครั้ง</span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                {c.username && <span>@{c.username}</span>}
                {c.phone && <span>{c.phone}</span>}
                {(c.province || c.district) && (
                  <span className="inline-flex items-center gap-0.5"><MapPin size={11} /> {[c.district, c.province].filter(Boolean).join(" ")}</span>
                )}
              </div>
              {c.past_items && c.past_items.length > 0 && (() => {
                const names = Array.from(new Set(c.past_items.map((p) => p.product)));
                return (
                  <div className="mt-1 flex items-start gap-1 text-[11px] text-brand-600">
                    <Sparkles size={11} className="mt-0.5 shrink-0" />
                    <span>เคยซื้อ ({c.past_items.length} รายการ): {names.slice(0, 6).join(", ")}{names.length > 6 ? ` +${names.length - 6}` : ""} — คลิกเพื่อเติมให้อัตโนมัติ</span>
                  </div>
                );
              })()}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div ref={wrapRef} className="relative">
      <input
        type={type}
        className={`input ${invalid ? "border-red-400 ring-2 ring-red-100" : ""}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (list.length > 0) setOpen(true); }}
        autoComplete="off"
      />
      {mounted && popup ? createPortal(popup, document.body) : null}
    </div>
  );
}
