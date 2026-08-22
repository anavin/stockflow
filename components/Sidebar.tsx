"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PLATFORMS, enabledPlatforms, platformBase, platformColor, platformTint } from "@/lib/config";
import { can, ROLE_LABELS, roleList } from "@/lib/auth/roles";
import { Package, PlusCircle, Upload, List, LogOut, Menu, X, Trash2, Users, ScanLine, Boxes, LayoutDashboard, BarChart3, FlaskConical, ScanBarcode, ShieldCheck, Truck, Droplets, Sticker, PackageOpen, History, ScrollText, ClipboardCheck, Undo2, PackageX } from "lucide-react";

export default function Sidebar({ user }: { user: { full_name: string; username: string; role: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const role = user.role;
  // เมนูขึ้นตามสิทธิ์ — สร้างใบเบิก vs จัดของ/ตัดสต๊อก แยกกัน
  const dashNav = can.viewDashboard(role)
    ? [{ href: "/", label: "หน้าหลัก", icon: LayoutDashboard, exact: true },
       { href: "/reports", label: "รายงาน & วิเคราะห์", icon: BarChart3, exact: true }]
    : [];
  // 1 ลิงก์/แพลตฟอร์มที่เปิดใช้ → หน้ารายการใบเบิก (สร้าง/นำเข้า/ถังขยะ อยู่ในหน้านั้น)
  const orderNav = can.createOrders(role)
    ? enabledPlatforms().map((p) => ({ href: platformBase(p.code), code: p.code, label: `ใบเบิก ${p.name}`, exact: true }))
    : [];
  // กลุ่ม "สินค้าสำเร็จรูป" — ตัดสต๊อก/จัดส่ง/ดูสต๊อก/SKU
  const finishedNav = [
    ...(can.issueStock(role) ? [{ href: "/stock/issue", label: "ตัดสต๊อก (สแกน)", icon: ScanLine }] : []),
    ...(can.viewStock(role) ? [{ href: "/ship", label: "จัดส่งสินค้า (สแกน)", icon: Truck, exact: true }] : []),
    ...(can.handleReturns(role) ? [{ href: "/returns", label: "รับคืนสินค้า (สแกน)", icon: Undo2, exact: true }] : []),
    ...(can.viewStock(role) ? [{ href: "/stock", label: "สต๊อกคงเหลือ", icon: Boxes, exact: true }] : []),
    ...(can.viewStock(role) ? [{ href: "/stock/damaged", label: "สต๊อกของชำรุด", icon: PackageX, exact: true }] : []),
    ...(can.viewStock(role) ? [{ href: "/stock/units", label: "ติดตาม SKU", icon: ScanBarcode }] : []),
  ];
  // กลุ่ม "คลังวัตถุดิบ" — กลิ่น(master)/น้ำหอม/สติ๊กเกอร์/ขวด/รับเข้า·เบิก/ประวัติ
  const materialNav = [
    ...(can.manageScents(role) ? [{ href: "/products", label: "จัดการกลิ่น", icon: FlaskConical, exact: true }] : []),
    ...(can.viewStock(role) ? [{ href: "/stock/bulk", label: "น้ำหอม (ยังไม่บรรจุ)", icon: Droplets, exact: true }] : []),
    ...(can.viewStock(role) ? [{ href: "/stock/labels", label: "สติ๊กเกอร์ & การ์ด", icon: Sticker, exact: true }] : []),
    ...(can.viewStock(role) ? [{ href: "/stock/packaging", label: "ขวด & แพ็คเกจ", icon: Package, exact: true }] : []),
    ...(can.manageStock(role) ? [{ href: "/stock/materials/issue", label: "รับเข้า / เบิก (รวม)", icon: PackageOpen, exact: true }] : []),
    ...(can.viewStock(role) ? [{ href: "/stock/materials/moves", label: "ประวัติวัตถุดิบ", icon: History }] : []),
  ];
  // กลุ่ม "ตั้งค่า & ข้อมูล" — อัปเดตยอด(ไฟล์)/อย./บันทึกการใช้งาน/ผู้ใช้
  const settingsNav = [
    ...(can.viewStock(role) ? [{ href: "/stock/count", label: "อัปเดตยอด (ไฟล์)", icon: ClipboardCheck, exact: true }] : []),
    ...(can.viewFda(role) ? [{ href: "/fda", label: "ข้อมูล อย.", icon: ShieldCheck, exact: true }] : []),
    ...(can.viewLogs(role) ? [{ href: "/activity", label: "บันทึกการใช้งาน", icon: ScrollText, exact: true }] : []),
    ...(can.manageUsers(role) ? [{ href: "/users", label: "จัดการผู้ใช้", icon: Users }] : []),
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  type NavItem = { href: string; label: string; icon: typeof Package; exact?: boolean };
  const navItems = (items: NavItem[]) => items.map((n) => {
    const Icon = n.icon;
    return (
      <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive(n.href, n.exact) ? "bg-soft font-medium text-ink" : "text-muted hover:bg-soft hover:text-ink"
        }`}>
        <Icon size={16} /> {n.label}
      </Link>
    );
  });
  // เมนูใบเบิกต่อแพลตฟอร์ม — จุดสีแบรนด์เสมอ + แถบสีซ้าย+พื้นจางตอน active
  const platformNav = (items: { href: string; code: string; label: string; exact?: boolean }[]) => items.map((n) => {
    const active = isActive(n.href, n.exact);
    const color = platformColor(n.code);
    return (
      <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
        className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "font-medium text-ink" : "text-muted hover:bg-soft hover:text-ink"}`}
        style={active ? { backgroundColor: platformTint(n.code, "14") } : undefined}>
        {active && <span className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full" style={{ backgroundColor: color }} />}
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} /> {n.label}
      </Link>
    );
  });
  const section = (title: string, items: NavItem[]) => items.length > 0 && (
    <>
      <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-faint">{title}</div>
      {navItems(items)}
    </>
  );

  const body = (
    <div className="flex h-full w-64 flex-col border-r border-line bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">เบิก</div>
        <div>
          <div className="text-sm font-bold leading-tight text-ink">ระบบเบิกสินค้า</div>
          <div className="text-[11px] text-muted">Lab Parfumo</div>
        </div>
      </div>

      {orderNav.length > 0 && (
        <div className="px-3">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted">
            <Package size={14} /> ใบเบิกสินค้า
          </div>
        </div>
      )}

      <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3">
        {navItems(dashNav)}
        {platformNav(orderNav)}
        {section("สินค้าสำเร็จรูป", finishedNav)}
        {section("คลังวัตถุดิบ", materialNav)}
        {section("ตั้งค่า & ข้อมูล", settingsNav)}

        {orderNav.length > 0 && PLATFORMS.some((p) => !p.enabled) && (
          <>
            <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-faint">แพลตฟอร์มอื่น</div>
            {PLATFORMS.filter((p) => !p.enabled).map((p) => (
              <div key={p.code} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: platformColor(p.code) }} /> {p.name}
                <span className="ml-auto text-[10px] text-faint">เร็วๆ นี้</span>
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-line p-3">
        <div className="mb-2 px-2">
          <div className="text-sm font-medium text-ink">{user.full_name || user.username}</div>
          <div className="text-[11px] text-muted">@{user.username} · {roleList(user.role).map((r) => ROLE_LABELS[r] || r).join(" · ") || user.role}</div>
        </div>
        <form action="/api/logout" method="post">
          <button className="btn-ghost w-full justify-start text-muted"><LogOut size={16} /> ออกจากระบบ</button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* mobile bar — โชว์ชื่อผู้ใช้ + ปุ่มออกจากระบบ ทุกหน้าบนมือถือ (ไม่ต้องเปิดเมนูก่อน) */}
      <div className="no-print flex items-center justify-between gap-2 border-b border-line bg-white px-4 py-3 md:hidden">
        <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-ink">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-bold text-white">เบิก</div>
          <span className="truncate">ระบบเบิกสินค้า</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="max-w-[84px] truncate text-xs text-muted">{user.full_name || user.username}</span>
          <form action="/api/logout" method="post">
            <button className="btn-ghost px-2 py-1 text-muted" title="ออกจากระบบ" aria-label="ออกจากระบบ"><LogOut size={16} /></button>
          </form>
          <button className="btn-ghost px-2 py-1" onClick={() => setOpen(true)} aria-label="เมนู"><Menu size={18} /></button>
        </div>
      </div>

      <aside className="no-print hidden md:sticky md:top-0 md:block md:h-screen md:self-start">{body}</aside>

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
