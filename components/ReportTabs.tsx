"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineChart, Megaphone, Factory, Users, Wrench } from "lucide-react";

const TABS = [
  { href: "/reports", label: "ภาพรวม", icon: LineChart },
  { href: "/reports/marketing", label: "การตลาด", icon: Megaphone },
  { href: "/reports/production", label: "การผลิต/สต๊อก", icon: Factory },
  { href: "/reports/customers", label: "ลูกค้า", icon: Users },
  { href: "/reports/ops", label: "Operations", icon: Wrench },
];

export default function ReportTabs() {
  const path = usePathname();
  return (
    <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-line bg-white p-1 shadow-card">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = path === t.href;
        return (
          <Link key={t.href} href={t.href}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-soft hover:text-ink"
            }`}>
            <Icon size={15} className={active ? "text-white" : "text-faint"} /> {t.label}
          </Link>
        );
      })}
    </div>
  );
}
