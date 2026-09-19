import { requireScents } from "@/lib/auth/require-user";
import { listPacks, getProducts, getSizes } from "@/lib/queries";
import PackManager from "@/components/PackManager";
import { PackageOpen } from "lucide-react";

export const dynamic = "force-dynamic";

// จัดการนิยามแพ็ค (bundle) — admin/คลัง แก้ได้เอง ไม่ต้องแก้โค้ด
export default async function PacksPage() {
  await requireScents();
  const [packs, products, sizes] = await Promise.all([listPacks(), getProducts(), getSizes()]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="mb-1 flex items-center gap-2 text-xl font-bold text-ink"><PackageOpen size={20} className="text-violet-600" /> จัดการแพ็ค (Bundle)</h1>
      <p className="mb-5 text-sm text-muted">
        สินค้า 1 listing = หลายขวดตายตัว → ระบบ<b className="text-ink">แตกเป็นกลิ่นย่อยอัตโนมัติตอน import</b> + มีปุ่ม “แตกแพ็ค” ในฟอร์มแก้ใบเบิก
        (เพื่อตัดสต๊อก/ผูก SKU รายขวด) · แก้ชื่อ/กลิ่น/คำจับได้ที่นี่
      </p>
      <PackManager packs={packs} products={products} sizes={sizes} />
    </div>
  );
}
