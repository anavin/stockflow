import { notFound } from "next/navigation";
import { requireStock } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listWholesaleCatalog, listWholesaleBranches, getProducts, getSizes } from "@/lib/queries";
import WholesaleManager from "@/components/WholesaleManager";
import { Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WholesalePage() {
  const me = await requireStock();
  if (!can.manageScents(me.role)) notFound();   // จัดการค้าส่ง = admin / ฝ่ายคลัง
  const [evb, kp, branches, products, sizes] = await Promise.all([
    listWholesaleCatalog("Eveandboy"), listWholesaleCatalog("KingPower"), listWholesaleBranches("Eveandboy"), getProducts(), getSizes(),
  ]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-1 flex items-center gap-2">
        <Store size={20} className="text-brand" />
        <h1 className="text-xl font-bold text-ink">จัดการค้าส่ง (Eveandboy / King Power)</h1>
      </div>
      <p className="mb-6 text-sm text-muted">แคตตาล็อกสินค้า (เลือกได้เฉพาะรายการนี้บนใบเบิก) + สาขา Eveandboy · แก้ไขแล้วมีผลกับฟอร์มใบเบิก/เอกสารทันที</p>
      <WholesaleManager catalog={{ Eveandboy: evb, KingPower: kp }} branches={branches} products={products} sizes={sizes} canEdit={can.manageScents(me.role)} />
    </div>
  );
}
