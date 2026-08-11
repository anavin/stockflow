import { PLATFORMS, type PlatformCode } from "./config";

/** Thai month-year label used by the Excel sheet, e.g. "ส.ค.-25". */
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export function monthLabel(d: Date): string {
  return `${TH_MONTHS[d.getMonth()]}-${String(d.getFullYear() % 100).padStart(2, "0")}`;
}

export function prefixFor(platform: string): string {
  return PLATFORMS.find((p) => p.code === platform)?.prefix ?? "SH";
}

/** Build a doc number from parts: SH-YY-MM-DD-#### */
export function formatDocNo(platform: string, date: Date, seq: number): string {
  const yy = String(date.getFullYear() % 100).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${prefixFor(platform)}-${yy}-${mm}-${dd}-${String(seq).padStart(4, "0")}`;
}

export function ymdKey(date: Date): string {
  const yy = String(date.getFullYear() % 100).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}
