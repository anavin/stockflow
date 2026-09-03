import { appEnv, ENV_BANNER } from "@/lib/env";

/** แถบเตือนสภาพแวดล้อม — โชว์เฉพาะ sandbox/staging (prod ไม่มีป้าย)
 *  server component: อ่าน env ตอน render บนเซิร์ฟเวอร์ → กันเผลอทดสอบบนระบบจริง */
export default function EnvBanner() {
  const b = ENV_BANNER[appEnv()];
  if (!b) return null;
  return (
    <div
      style={{ background: b.bg, color: b.fg }}
      className="sticky top-0 z-[100] select-none px-3 py-1 text-center text-xs font-bold tracking-wide"
    >
      {b.label}
    </div>
  );
}
