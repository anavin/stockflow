import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "brand" | "green" | "amber" | "red" | "slate";

const ICON_TONE: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-600",
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  slate: "bg-soft text-muted",
};

const BAR_TONE: Record<Tone, string> = {
  brand: "from-brand-300 to-brand",
  green: "from-green-300 to-green-500",
  amber: "from-amber-300 to-amber-500",
  red: "from-red-300 to-red-500",
  slate: "from-slate-300 to-slate-400",
};

/** หัวหน้ารายงาน — ไอคอนไล่เฉดแบรนด์ + หัวข้อใหญ่ + คำอธิบาย (+ ปุ่มย้อนกลับ) */
export function ReportHeader({
  title, subtitle, icon, back,
}: { title: string; subtitle?: ReactNode; icon: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink">
          <ChevronLeft size={16} /> {back.label}
        </Link>
      )}
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-600 text-white shadow-card">
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

/** การ์ดตัวเลข KPI — ป้ายเล็กด้านบน · ตัวเลขเด่น · ไอคอนในกล่องสีอ่อน */
export function Kpi({
  label, value, sub, icon, tone = "brand",
}: { label: string; value: string; sub?: string; icon: ReactNode; tone?: Tone }) {
  return (
    <div className="card p-4 transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-muted">{label}</div>
          <div className="mt-1.5 text-[26px] font-bold leading-none tracking-tight tabular-nums text-ink">{value}</div>
          {sub && <div className="mt-1 text-xs text-faint">{sub}</div>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ICON_TONE[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

/** แถบสัดส่วน — ไล่เฉด + ปลายมน บนรางพื้นอ่อน */
export function Bar({ pct, tone = "brand" }: { pct: number; tone?: Tone }) {
  const w = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-soft">
      <div className={`h-full rounded-full bg-gradient-to-r ${BAR_TONE[tone]}`} style={{ width: `${w < 2 && w > 0 ? 2 : w}%` }} />
    </div>
  );
}

/** การ์ดหมวด — หัวการ์ดมีไอคอนในกล่องสีอ่อน + ปุ่ม action มุมขวา */
export function SectionCard({
  title, icon, action, children, className = "", tone = "brand",
}: { title: ReactNode; icon: ReactNode; action?: ReactNode; children: ReactNode; className?: string; tone?: Tone }) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-5 py-3.5">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${ICON_TONE[tone]}`}>{icon}</span>
        <span className="text-sm font-semibold text-ink">{title}</span>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}
