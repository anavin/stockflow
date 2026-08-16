import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { can, homeFor } from "@/lib/auth/roles";
import { listSpecOptions, listSpecRules } from "@/lib/queries";
import SpecManager from "@/components/SpecManager";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SpecOptionsPage() {
  const me = await requireUser();
  if (!can.issueStock(me.role) && !can.createOrders(me.role)) redirect(homeFor(me.role));  // admin/picker/creator
  const [specs, rules] = await Promise.all([listSpecOptions(), listSpecRules()]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับหน้าหลัก
      </Link>
      <h1 className="mb-1 text-xl font-bold text-ink">จัดการสเป็กสินค้า</h1>
      <p className="mb-6 text-sm text-muted">รายการสเป็ก + เงื่อนไขเลือกอัตโนมัติ (ตามขนาด+Grade) — เพิ่ม / แก้ / เปิด-ปิด / ลบ ได้เอง</p>
      <SpecManager specs={specs} rules={rules} />
    </div>
  );
}
