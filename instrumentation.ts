// ตั้ง timezone ทั้งระบบเป็นไทย (Asia/Bangkok, UTC+7) — Next.js เรียก register() ตอน server เริ่ม
// ก่อนโค้ดอื่นทำงาน จึงมีผลกับ new Date(), toLocaleString, การออกเลขใบเบิก/วันนี้ ทั้งหมด
export function register() {
  process.env.TZ = "Asia/Bangkok";
}
