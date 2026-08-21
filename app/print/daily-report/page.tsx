import { requireDashboard } from "@/lib/auth/require-user";
import { shopeeReportRows } from "@/lib/queries";
import { DailyReportSheet } from "@/components/DailyReportSheet";
import PrintNow from "@/components/PrintNow";

// หน้าพิมพ์แบบ standalone (นอก layout (app) — ขาวล้วน Safari พิมพ์ได้นิ่ง) แนวเดียวกับ CTW
// สร้างรายงานตามฟิลเตอร์เดียวกับหน้า /shopee (เดือน/ช่วงวันที่/สถานะ/ค้นหา) · ไม่มีฟิลเตอร์ = วันนี้
export const dynamic = "force-dynamic";

const bkkToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const dOK = (s?: string) => (s || "").match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
const thaiFull = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const thaiShort = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

type SP = { q?: string; month?: string; from?: string; to?: string; issued?: string; shipped?: string; date?: string; detail?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const from = dOK(sp.date) || dOK(sp.from);
  const to = dOK(sp.date) || dOK(sp.to);
  const tag = from && to ? (from === to ? from : `${from}_${to}`) : from || to || sp.month || bkkToday();
  return { title: `Shopee-Report-${tag}` };
}

export default async function ShopeeReportPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireDashboard();
  const sp = await searchParams;
  const date = dOK(sp.date);
  let from = date || dOK(sp.from);
  let to = date || dOK(sp.to);
  const month = sp.month || undefined;
  const iss = sp.issued === "yes" || sp.issued === "no" ? sp.issued : undefined;
  const shp = sp.shipped === "yes" || sp.shipped === "no" ? sp.shipped : undefined;
  const q = sp.q || undefined;
  const showDetail = sp.detail !== "0";
  // ไม่ระบุช่วง/เดือนเลย → วันนี้ (กันดึงทั้งหมดโดยไม่ตั้งใจ)
  if (!from && !to && !month) { from = bkkToday(); to = from; }

  const rows = await shopeeReportRows({ search: q, month, from, to, issued: iss, shipped: shp });

  const rangeLabel = from && to ? (from === to ? thaiFull(from) : `${thaiShort(from)} – ${thaiShort(to)}`)
    : from ? `ตั้งแต่ ${thaiShort(from)}` : to ? `ถึง ${thaiShort(to)}` : month ? `เดือน ${month}` : "ทั้งหมด";
  const noteParts = [
    q ? `ค้นหา "${q}"` : "",
    iss === "yes" ? "เฉพาะตัดสต๊อกแล้ว" : iss === "no" ? "เฉพาะรอตัดสต๊อก" : "",
    shp === "yes" ? "เฉพาะส่งแล้ว" : shp === "no" ? "เฉพาะยังไม่ส่ง" : "",
  ].filter(Boolean);
  const note = noteParts.join(" · ") || undefined;

  const generatedAt = new Date().toLocaleString("th-TH", {
    day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok",
  });

  return (
    <div className="min-h-screen bg-white text-black" style={{ fontFamily: "'Sarabun','Noto Sans Thai','IBM Plex Sans Thai',system-ui,sans-serif" }}>
      {/* ตั้งค่าพิมพ์ A4 แนวตั้ง (override @page landscape ของใบเบิกในหน้านี้เท่านั้น) + กันหน้าเปล่า (แนว CTW) */}
      <style dangerouslySetInnerHTML={{ __html: `
@media print {
  @page { size: A4 portrait; margin: 14mm; }
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  .no-print { display: none !important; }
  .daily-sheet { max-width: none !important; padding: 0 !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; margin: 0 !important; }
  .daily-sheet table { page-break-inside: auto; }
  .daily-sheet tr { page-break-inside: avoid; }
  .daily-sheet thead { display: table-header-group; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
` }} />
      <div className="mx-auto w-full max-w-[820px] px-4 py-4">
        <div className="mb-4"><PrintNow title={`Shopee-Report-${from || to || month || bkkToday()}`} /></div>
        <DailyReportSheet rangeLabel={rangeLabel} note={note} rows={rows} showDetail={showDetail} generatedAt={generatedAt} />
      </div>
    </div>
  );
}
