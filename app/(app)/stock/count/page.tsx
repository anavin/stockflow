import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { isAdmin } from "@/lib/auth/roles";
import InventoryCount from "@/components/InventoryCount";
import { ChevronLeft, ClipboardCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StockCountPage() {
  const me = await requireStock();   // ทุกคนที่เห็นสต๊อกเข้าได้ · อัปโหลด/เทมเพลต = แอดมินเท่านั้น
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href="/stock" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับหน้าสต๊อก
      </Link>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink"><ClipboardCheck size={18} /> อัปเดตยอดสต๊อกจากไฟล์ (นับสต๊อก)</h1>
        <p className="mt-0.5 text-sm text-muted">ดาวน์โหลดเทมเพลต (เติม SKU ให้แล้ว) → กรอกยอดนับได้จริง → อัปโหลดทีเดียว · ครบทั้งสำเร็จรูป + วัตถุดิบ · ตัวเลขที่กรอก = ตั้งเป็นยอดคงเหลือใหม่</p>
      </div>
      <InventoryCount canUpload={isAdmin(me.role)} />
    </div>
  );
}
