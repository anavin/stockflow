import Link from "next/link";
import { notFound } from "next/navigation";
import { resolvePlatform, platformBase } from "@/lib/config";
import ImportWizard from "@/components/ImportWizard";
import { ChevronLeft } from "lucide-react";
import { requireCreator } from "@/lib/auth/require-user";

export default async function ImportPage({ params }: { params: Promise<{ platform: string }> }) {
  await requireCreator();
  const pf = resolvePlatform((await params).platform);
  if (!pf) notFound();
  const base = platformBase(pf.code);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href={base} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <h1 className="mb-1 text-xl font-bold text-ink">นำเข้าใบเบิก {pf.name}</h1>
      <p className="mb-6 text-sm text-muted">อัปโหลดไฟล์ Excel (.xlsx) หรือ CSV — ระบบจะจับกลุ่มแต่ละบรรทัดเป็นออร์เดอร์ตาม Order No. อัตโนมัติ</p>
      <ImportWizard platform={pf.code} />
    </div>
  );
}
