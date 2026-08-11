"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PLATFORMS } from "@/lib/config";
import { Package, PlusCircle, Upload, List, LogOut, Menu, X, Trash2, Users, ScanLine, Boxes, LayoutDashboard } from "lucide-react";

export default function Sidebar({ user }: { user: { full_name: string; username: string; role: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = [
    { href: "/", label: "หน้าหลัก", icon: LayoutDashboard, exact: true },
    { href: "/shopee", label: "ใบเบิก Shopee", icon: List, exact: true },
    { href: "/shopee/new", label: "สร้างใบเบิกใหม่", icon: PlusCircle },
    { href: "/shopee/import", label: "นำเข้า Excel/CSV", icon: Upload },
    { href: "/shopee/trash", label: "ถังขยะ", icon: Trash2 },
  ];

  const stockNav = [
    { href: "/stock/issue", label: "ตัดสต๊อก (สแกน)", icon: ScanLine },
    { href: "/stock", label: "สต๊อกคงเหลือ", icon: Boxes, exact: true },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const body = (
    <div className="flex h-full w-64 flex-col border-r border-line bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">เบิก</div>
        <div>
          <div className="text-sm font-bold leading-tight text-ink">ระบบเบิกสินค้า</div>
          <div className="text-[11px] text-muted">Lab Parfumo</div>
        </div>
      </div>

      <div className="px-3">
        <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-600">
          <Package size={14} /> Shopee
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-0.5 px-3">
        {nav.map((n) => {
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              prefetch={false}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive(n.href, n.exact) ? "bg-soft font-medium text-ink" : "text-muted hover:bg-soft hover:text-ink"
              }`}
            >
              <Icon size={16} /> {n.label}
            </Link>
          );
        })}

        <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-faint">สต๊อกสินค้า</div>
        {stockNav.map((n) => {
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href} prefetch={false} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive(n.href, n.exact) ? "bg-soft font-medium text-ink" : "text-muted hover:bg-soft hover:text-ink"
              }`}>
              <Icon size={16} /> {n.label}
            </Link>
          );
        })}

        {user.role === "admin" && (
          <Link href="/users" prefetch={false} onClick={() => setOpen(false)}
            className={`mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive("/users") ? "bg-soft font-medium text-ink" : "text-muted hover:bg-soft hover:text-ink"
            }`}>
            <Users size={16} /> จัดการผู้ใช้
          </Link>
        )}

        <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-faint">แพลตฟอร์มอื่น</div>
        {PLATFORMS.filter((p) => !p.enabled).map((p) => (
          <div key={p.code} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-faint">
            <span className="inline-block h-4 w-4 rounded bg-line" /> {p.name}
            <span className="ml-auto text-[10px]">เร็วๆ นี้</span>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <div className="mb-2 px-2">
          <div className="text-sm font-medium text-ink">{user.full_name || user.username}</div>
          <div className="text-[11px] text-muted">@{user.username} · {user.role}</div>
        </div>
        <form action="/api/logout" method="post">
          <button className="btn-ghost w-full justify-start text-muted"><LogOut size={16} /> ออกจากระบบ</button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* mobile bar */}
      <div className="no-print flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-xs font-bold text-white">เบิก</div>
          ระบบเบิกสินค้า
        </div>
        <button className="btn-ghost px-2 py-1" onClick={() => setOpen(true)}><Menu size={18} /></button>
      </div>

      <aside className="no-print hidden md:block">{body}</aside>

      {open && (
        <div className="no-print fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <button className="absolute right-3 top-3 z-10 text-muted" onClick={() => setOpen(false)}><X size={20} /></button>
            {body}
          </div>
        </div>
      )}
    </>
  );
}
