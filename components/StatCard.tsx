import Link from "next/link";

const TONES = {
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-600",
  brand: "bg-brand-50 text-brand",
} as const;

/** การ์ดตัวเลขสรุป — คลิกไปดูรายการได้ "เฉพาะเมื่อมีรายการ" (value>0 และมี href) · ไม่งั้นเป็นการ์ดเฉยๆ */
export default function StatCard({ value, label, tone, href, title }: {
  value: number; label: string; tone: keyof typeof TONES; href?: string; title?: string;
}) {
  const t = TONES[tone];
  const clickable = href && value > 0;
  const inner = (
    <>
      <div className="text-3xl font-bold leading-none">{value.toLocaleString()}</div>
      <div className={`mt-1 text-xs font-medium ${clickable ? "inline-flex items-center gap-0.5" : ""} opacity-80`}>
        {label}{clickable && <span aria-hidden className="text-[10px]">›</span>}
      </div>
    </>
  );
  const cls = `card p-4 text-center ${t}`;
  return clickable
    ? <Link href={href!} title={title} className={`${cls} block transition hover:brightness-95`}>{inner}</Link>
    : <div className={cls}>{inner}</div>;
}
