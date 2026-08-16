import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { listSpecOptions } from "@/lib/queries";
import SpecManager from "@/components/SpecManager";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SpecOptionsPage() {
  await requireStock();
  const specs = await listSpecOptions();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <Link href="/stock/issue" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับหน้าตัดสต๊อก
      </Link>
      <h1 className="mb-1 text-xl font-bold text-ink">จัดการสเป็กสินค้า</h1>
      <p className="mb-6 text-sm text-muted">รายการสเป็กที่ใช้เลือกตอนตัดสต๊อก — เพิ่ม / แก้ชื่อ / เปิด-ปิด / ลบ ได้</p>
      <SpecManager specs={specs} />
    </div>
  );
}
