import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-user";
import { customerIdCoverage } from "@/lib/queries";
import RecomputeCustomerBtn from "@/components/RecomputeCustomerBtn";
import CustomerDataQuality from "@/components/CustomerDataQuality";
import { ChevronLeft, Wrench, Users2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  await requireAdmin();
  const idCov = await customerIdCoverage();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <h1 className="flex items-center gap-2 text-xl font-bold text-ink"><Wrench size={20} className="text-brand" /> ดูแลข้อมูล</h1>
      <p className="mb-6 mt-0.5 text-sm text-muted">เครื่องมือจัดการข้อมูลสำหรับแอดมิน — ปกติไม่ต้องใช้ (ระบบจัดให้อัตโนมัติตอนสร้าง/นำเข้าใบเบิก)</p>

      <section className="card p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Users2 size={16} className="text-brand" /> จัดประเภทลูกค้า (ใหม่/เก่า) + ซื้อครั้งที่</h2>
          <RecomputeCustomerBtn />
        </div>
        <ul className="mb-4 mt-2 space-y-1 text-xs leading-relaxed text-muted">
          <li>• <b className="text-ink">จัดที่ว่าง</b> — จัดเฉพาะออร์เดอร์ที่ยัง "ไม่ระบุ" (มี username หรือเบอร์) โดยไม่ทับของเดิม · ปลอดภัย กดซ้ำได้</li>
          <li>• <b className="text-amber-700">จัดใหม่ทั้งหมด</b> — เรียงตามวันที่ใหม่ + ทับของเดิม → ลำดับ "ซื้อครั้งที่" ถูก 100% แม้เคยคีย์ใบย้อนหลัง (ใช้นานๆ ครั้ง)</li>
          <li>• จับคู่ลูกค้าด้วย <b>username</b> ก่อน ถ้าว่างใช้ <b>เบอร์โทร</b> · ใบที่ไม่มีทั้งคู่จัดไม่ได้ (ต้องเติมข้อมูลในไฟล์นำเข้า)</li>
        </ul>
        <div className="border-t border-line pt-2">
          <p className="mb-1 px-1 text-[11px] font-medium text-muted">ความครบของข้อมูลลูกค้า (ดูว่ามีอะไรให้จัดไหม)</p>
          <CustomerDataQuality rows={idCov} />
        </div>
      </section>
    </div>
  );
}
