import Link from "next/link";
import { requireCreator } from "@/lib/auth/require-user";
import { listProductsAdmin, getScentBarcodes } from "@/lib/queries";
import ProductsManager from "@/components/ProductsManager";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requireCreator();
  const [products, sizesByScent] = await Promise.all([listProductsAdmin(), getScentBarcodes()]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <h1 className="mb-1 text-xl font-bold text-ink">จัดการกลิ่น</h1>
      <p className="mb-6 text-sm text-muted">เพิ่ม / แก้ชื่อ / รหัส / บาร์โค้ด / ประเภท / ขนาด — ที่เดียวจบ · มีผลกับ dropdown ตอนสร้างใบเบิก และการจับกลิ่นตอน import</p>
      <ProductsManager products={products} sizesByScent={sizesByScent} />
    </div>
  );
}
