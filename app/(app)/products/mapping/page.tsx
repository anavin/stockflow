import Link from "next/link";
import { requireCreator } from "@/lib/auth/require-user";
import { listProductsAdmin } from "@/lib/queries";
import TypeMapper from "@/components/TypeMapper";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductTypeMappingPage() {
  await requireCreator();
  const products = await listProductsAdmin();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <Link href="/products" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับหน้าจัดการกลิ่น
      </Link>
      <h1 className="mb-1 text-xl font-bold text-ink">จับคู่ประเภทน้ำหอม</h1>
      <p className="mb-6 text-sm text-muted">
        กลิ่นทั้งหมด {products.length.toLocaleString()} รายการ · ค่าเริ่มต้นตามที่ตั้งไว้ · เลือกประเภทแล้วกด “บันทึกทั้งหมด” ทีเดียว
      </p>
      <TypeMapper products={products} />
    </div>
  );
}
