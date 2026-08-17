import { requireStock } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listFda, fdaExpirySummary } from "@/lib/queries";
import FdaManager from "@/components/FdaManager";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FdaPage() {
  const me = await requireStock();
  const canEdit = can.manageStock(me.role);
  const [rows, summary] = await Promise.all([listFda(), fdaExpirySummary()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink"><ShieldCheck size={20} /> ข้อมูล อย.</h1>
        <p className="mt-0.5 text-sm text-muted">ทะเบียนจดแจ้ง อย. ของน้ำหอม + แจ้งเตือนก่อนหมดอายุ 30 / 15 / 10 วัน — ทั้งหมด {summary.total.toLocaleString()} รายการ</p>
      </div>
      <FdaManager rows={rows} summary={summary} canEdit={canEdit} />
    </div>
  );
}
