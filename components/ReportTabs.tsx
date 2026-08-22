"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/reports", label: "ภาพรวม" },
  { href: "/reports/marketing", label: "การตลาด" },
  { href: "/reports/production", label: "การผลิต/สต๊อก" },
  { href: "/reports/customers", label: "ลูกค้า" },
  { href: "/reports/ops", label: "Operations" },
];

export default function ReportTabs() {
  const path = usePathname();
  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link key={t.href} href={t.href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${active ? "border-brand text-brand-600" : "border-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
