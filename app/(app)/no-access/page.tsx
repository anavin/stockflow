import { requireUser } from "@/lib/auth/require-user";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

// หน้าปลายทางสำหรับบัญชีที่ยังไม่ได้กำหนดบทบาท (หรือบทบาทไม่รู้จัก) — ต้องแค่ login
// จึงไม่เกิด redirect loop กับ guard อื่น ๆ
export default async function NoAccessPage() {
  const me = await requireUser();
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <ShieldAlert size={28} />
      </div>
      <h1 className="text-xl font-bold text-ink">บัญชีนี้ยังไม่ได้กำหนดสิทธิ์</h1>
      <p className="mt-2 text-sm text-muted">
        @{me.username} · บทบาท “{ROLE_LABELS[me.role] || me.role || "—"}” ยังไม่มีสิทธิ์เข้าใช้งานส่วนใด
        กรุณาให้ผู้ดูแลระบบกำหนดบทบาท (สร้างใบเบิก / จัดของ-ตัดสต๊อก) ที่หน้า “จัดการผู้ใช้”
      </p>
      <form action="/api/logout" method="post" className="mt-6">
        <button className="btn-ghost">ออกจากระบบ</button>
      </form>
    </div>
  );
}
