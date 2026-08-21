"use client";
import { platformColor, platformTint, platformName } from "@/lib/config";

/** จุดสีประจำแพลตฟอร์ม (ใช้นำหน้าเลขออร์เดอร์ในตาราง) */
export function PlatformDot({ platform, size = 8 }: { platform?: string | null; size?: number }) {
  return (
    <span className="inline-block shrink-0 rounded-full align-middle" title={platformName(platform || undefined)}
      style={{ width: size, height: size, backgroundColor: platformColor(platform || undefined) }} />
  );
}

/** ป้ายแพลตฟอร์ม (จุด + ชื่อ) — พื้น tint + ตัวอักษรสีแบรนด์ (contrast-safe ทุกสี) */
export function PlatformBadge({ platform, className = "" }: { platform?: string | null; className?: string }) {
  if (!platform) return null;
  const c = platformColor(platform);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
      style={{ color: c, backgroundColor: platformTint(platform) }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} /> {platformName(platform)}
    </span>
  );
}
