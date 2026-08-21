import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-user";
import { listUsers } from "@/lib/queries";
import UsersManager from "@/components/UsersManager";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await listUsers();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <h1 className="mb-1 text-xl font-bold text-ink">จัดการผู้ใช้</h1>
      <p className="mb-6 text-sm text-muted">เพิ่ม/ปิดใช้งานบัญชี และกำหนดบทบาท — 4 บทบาท: ฝ่ายขาย · ฝ่ายจัดของ · ฝ่ายคลัง · แอดมิน (แยกงานกันไม่ให้ทำข้ามสิทธิ์)</p>
      <UsersManager users={users} meId={me.id} />
    </div>
  );
}
