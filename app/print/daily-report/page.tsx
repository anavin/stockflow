import { requireDashboard } from "@/lib/auth/require-user";
import { shopeeDailyRows } from "@/lib/queries";
import { DailyReportSheet } from "@/components/DailyReportSheet";
import PrintNow from "@/components/PrintNow";

// หน้าพิมพ์แบบ standalone (นอก layout (app) — ไม่มี sidebar/ธีม = ขาวล้วน Safari พิมพ์ได้นิ่ง)
// แนวเดียวกับรายงานประจำวันของ CTW (lab-parfumo-central/app/print/daily-report)
export const dynamic = "force-dynamic";

const bkkToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const date = (sp.date || "").match(/^\d{4}-\d{2}-\d{2}$/)?.[0] || bkkToday();
  return { title: `Shopee-Daily-Report-${date}` };
}

export default async function ShopeeDailyReportPage({ searchParams }: { searchParams: Promise<{ date?: string; detail?: string }> }) {
  await requireDashboard();
  const sp = await searchParams;
  const date = (sp.date || "").match(/^\d{4}-\d{2}-\d{2}$/)?.[0] || bkkToday();
  const showDetail = sp.detail !== "0";

  const rows = await shopeeDailyRows(date);
  const generatedAt = new Date().toLocaleString("th-TH", {
    day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok",
  });

  return (
    <div className="min-h-screen bg-white text-black" style={{ fontFamily: "'Sarabun','Noto Sans Thai','IBM Plex Sans Thai',system-ui,sans-serif" }}>
      <div className="mx-auto w-full max-w-[820px] px-4 py-4">
        <div className="mb-4"><PrintNow title={`Shopee-Daily-Report-${date}`} /></div>
        <DailyReportSheet date={date} rows={rows} showDetail={showDetail} generatedAt={generatedAt} />
      </div>
    </div>
  );
}
