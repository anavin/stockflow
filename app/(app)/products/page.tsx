import Link from "next/link";
import { requireCreator } from "@/lib/auth/require-user";
import { listProductsAdmin, getScentBarcodes, getDiscontinued } from "@/lib/queries";
import ProductsManager from "@/components/ProductsManager";
import { ChevronLeft, Tags } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requireCreator();
  const [products, sizesByScent, discontinued] = await Promise.all([listProductsAdmin(), getScentBarcodes(), getDiscontinued()]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-bold text-ink">จัดการกลิ่น</h1>
          <p className="text-sm text-muted">เพิ่ม / แก้ชื่อ / รหัส / บาร์โค้ด / Grade / ขนาด — ที่เดียวจบ · มีผลกับ dropdown ตอนสร้างใบเบิก และการจับกลิ่นตอน import</p>
        </div>
        <Link href="/stock/specs" className="btn-ghost shrink-0"><Tags size={16} /> จัดการสเป็ก</Link>
      </div>
      <ProductsManager products={products} sizesByScent={sizesByScent} discontinued={discontinued} />
    </div>
  );
}
