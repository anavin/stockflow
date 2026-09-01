# CTW ↔ stockflow — API เชื่อมใบเบิกโอนสาขา

คลังกลาง = **stockflow** (labparfumo-stock.vercel.app) · สาขา = **CTW/central**
ผูกกันด้วย **PO Order No. (`WPO...`)** เป็นกุญแจร่วม · สินค้าอ้างด้วย **บาร์โค้ด** (ตรงกันทั้งสองระบบแล้ว)

## Auth
ทุก endpoint ต้องมี header:
```
Authorization: Bearer <CTW_API_KEY>
```
(ตั้ง `CTW_API_KEY` ใน env ของ stockflow บน Vercel — สุ่มด้วย `openssl rand -hex 24`)

Base URL: `https://labparfumo-stock.vercel.app`

---

## (A) CTW ส่งใบเบิกเข้าคลังกลาง
`POST /api/ctw/requisition`
```json
{
  "po_no": "WPO260829001",
  "branch": "01_CTW",
  "items": [
    { "barcode": "8857128012026", "qty": 3 },
    { "barcode": "8857128012034", "qty": 4 }
  ]
}
```
ตอบ `200`:
```json
{ "ok": true, "order_no": "WPO260829001", "saved": 2, "unmatched": [] }
```
- `unmatched` = บาร์โค้ดที่ไม่มีในระบบ (ไม่ถูกบันทึก) — ควรเช็ค
- ยิงซ้ำ po_no เดิม = อัปเดตรายการ (ตราบใดยังไม่ตัดสต๊อก) · ถ้าตัดแล้วจะปฏิเสธ

## (B) CTW ดึงสถานะ + SKU ที่คลังส่งจริง
`GET /api/ctw/requisition/{po_no}`
```json
{
  "ok": true, "order_no": "WPO260829001", "branch": "01_CTW",
  "status": "dispatched",              // created → issued → dispatched → received
  "issued_at": "...", "dispatched_at": "...", "received_at": null,
  "items": [ { "product": "Aqua", "size": "10 ml.", "qty": 3 } ],
  "skus":  [ { "sku": "AQA-...", "product": "Aqua", "size": "10 ml.", "barcode": "8857128012026" } ]   // ชิ้นจริงที่ส่ง
}
```
CTW poll ตัวนี้จนกว่า `status = "dispatched"` แล้วเอา `skus` ไปลงสต๊อกสาขาตอนกดรับ

## (C) CTW กดรับ (ปิดใบเบิก)
`POST /api/ctw/requisition/{po_no}/receive`
```json
{ "received_by": "ชื่อ/รหัสพนักงาน CTW" }
```
ตอบ `200`: `{ "ok": true, "received_at": "..." }` (รับซ้ำ → `already: true`)
- ต้องคลัง **จัดส่งแล้ว** (`status = dispatched`) ก่อน ไม่งั้น `409`
- CTW ควร: เพิ่ม `skus` เข้าสต๊อกสาขาฝั่งตัวเอง **แล้วค่อย** เรียก endpoint นี้

---

## ลำดับงานเต็ม
```
CTW: สร้าง WPO → (A) POST requisition
คลัง: สแกน WPO → ตัดสต๊อก + สแกน SKU รายชิ้น → จัดส่ง (dispatched)
CTW: (B) poll จน dispatched → เอา skus ลงสต๊อกสาขา → (C) POST receive
```
สถานะบน stockflow: `สร้าง → ตัดสต๊อก(SKU) → จัดส่ง CTW → CTW รับแล้ว`
