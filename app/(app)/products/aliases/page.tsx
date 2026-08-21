import Link from "next/link";
import { requireScents } from "@/lib/auth/require-user";
import { listScentAliases, getProducts } from "@/lib/queries";
import AliasManager from "@/components/AliasManager";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AliasesPage() {
  await requireScents();
  const [aliases, products] = await Promise.all([listScentAliases(), getProducts()]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href="/products" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับจัดการกลิ่น
      </Link>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">ชื่อพ้องกลิ่น (Alias)</h1>
        <p className="text-sm text-muted">แผนที่จากชื่อกลิ่นที่ Shopee/Lazada เขียนไม่ตรง → ชื่อจริงในระบบ · ใช้ตอนนำเข้าเพื่อจับกลิ่นให้ถูก</p>
      </div>
      <AliasManager aliases={aliases} products={products} />
    </div>
  );
}
