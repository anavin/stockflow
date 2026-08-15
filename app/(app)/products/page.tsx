import Link from "next/link";
import { requireCreator } from "@/lib/auth/require-user";
import { listProductsAdmin } from "@/lib/queries";
import ProductsManager from "@/components/ProductsManager";
import { ChevronLeft, Tags } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requireCreator();
  const products = await listProductsAdmin();
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-bold text-ink">จัดการรายชื่อกลิ่น</h1>
          <p className="text-sm text-muted">เพิ่ม / แก้ชื่อ / เปิด-ปิด กลิ่นในระบบ — มีผลกับ dropdown ตอนสร้างใบเบิก และการจับกลิ่นตอน import</p>
        </div>
        <Link href="/products/mapping" className="btn-primary shrink-0"><Tags size={16} /> จับคู่ประเภท</Link>
      </div>
      <ProductsManager products={products} />
    </div>
  );
}
