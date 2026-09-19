import { requireUser } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listPacks, getProducts, getSizes } from "@/lib/queries";
import PackManager from "@/components/PackManager";
import { PackageOpen } from "lucide-react";

export const dynamic = "force-dynamic";

// นิยามแพ็ค (bundle) — เห็นได้ทุก role (ดู) · แก้ได้เฉพาะ admin/คลัง (manageScents)
export default async function PacksPage() {
  const me = await requireUser();
  const canEdit = can.manageScents(me.role);
  const [packs, products, sizes] = await Promise.all([listPacks(), getProducts(), getSizes()]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="mb-1 flex items-center gap-2 text-xl font-bold text-ink"><PackageOpen size={20} className="text-violet-600" /> จัดการแพ็ค (Bundle)</h1>
      <p className="mb-5 text-sm text-muted">
        สินค้า 1 listing = หลายขวดตายตัว → ระบบ<b className="text-ink">แตกเป็นกลิ่นย่อยอัตโนมัติตอน import</b> + มีปุ่ม “แตกแพ็ค” ในฟอร์มแก้ใบเบิก
        (เพื่อตัดสต๊อก/ผูก SKU รายขวด){canEdit ? " · แก้ชื่อ/กลิ่น/คำจับได้ที่นี่" : " · (ดูอย่างเดียว — แก้ได้เฉพาะแอดมิน/คลัง)"}
      </p>
      <PackManager packs={packs} products={products} sizes={sizes} canEdit={canEdit} />
    </div>
  );
}
