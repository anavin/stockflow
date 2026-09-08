import { requireCreator } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { getProducts, listTryMe, tryMeStats } from "@/lib/queries";
import { resolvePlatform } from "@/lib/config";
import TryMeManager from "@/components/TryMeManager";
import { FlaskConical } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TryMePage({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  const me = await requireCreator();
  const pf = resolvePlatform((await searchParams).platform)?.code;
  const [allScents, rows, stats] = await Promise.all([getProducts(), listTryMe(100), tryMeStats()]);
  const scents = allScents.filter((s) => !/try\s*me/i.test(s));   // เลือกกลิ่นฐาน (ไม่ใช่สินค้า "X TRY ME!")

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <h1 className="mb-1 flex items-center gap-2 text-xl font-bold text-ink"><FlaskConical size={20} className="text-brand" /> Try Me · เทสเตอร์</h1>
      <p className="mb-5 text-sm text-muted">เบิกฟรีต่อครั้งตาม request — เฉพาะ CTW / Eveandboy / King Power</p>
      <TryMeManager scents={scents} rows={rows} stats={stats.byPlatform} total={stats.total} initialPlatform={pf} canDelete={can.manageStock(me.role)} />
    </div>
  );
}
