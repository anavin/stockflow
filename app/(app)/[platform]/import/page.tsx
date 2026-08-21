import Link from "next/link";
import { notFound } from "next/navigation";
import { resolvePlatform, platformBase, canImportPlatform, platformColor, platformTint } from "@/lib/config";
import ImportWizard from "@/components/ImportWizard";
import { ChevronLeft } from "lucide-react";
import { requireCreator } from "@/lib/auth/require-user";

export default async function ImportPage({ params }: { params: Promise<{ platform: string }> }) {
  await requireCreator();
  const pf = resolvePlatform((await params).platform);
  if (!pf) notFound();
  // แพลตฟอร์มที่ยังไม่มี parser (Line/Website/Office) — ยังไม่เปิดนำเข้า เข้ามาตรง ๆ ให้ 404
  if (!canImportPlatform(pf.code)) notFound();
  const base = platformBase(pf.code);
  const pfColor = platformColor(pf.code);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-5 h-1 w-full rounded-full" style={{ backgroundColor: pfColor }} />
      <Link href={base} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-ink">นำเข้าใบเบิก</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ color: pfColor, backgroundColor: platformTint(pf.code) }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pfColor }} /> {pf.name}
        </span>
      </div>
      <p className="mb-6 text-sm text-muted">อัปโหลดไฟล์ Excel (.xlsx) หรือ CSV — ระบบจะจับกลุ่มแต่ละบรรทัดเป็นออร์เดอร์ตาม Order No. อัตโนมัติ</p>
      <ImportWizard platform={pf.code} />
    </div>
  );
}
