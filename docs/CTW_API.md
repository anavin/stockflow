# stockflow → CTW — ส่งใบเบิกโอนสาขา (push ทางเดียว)

**คลังกลาง (stockflow) เป็นคนสร้างใบเบิก + ตัดสต๊อก + ใส่ SKU เอง** แล้ว push ไปให้ระบบ CTW
ระบบ CTW มีหน้าที่แค่ **รับ webhook** แล้วเอาไปดำเนินการต่อ (ลงสต๊อกสาขา ฯลฯ)

## Flow
```
stockflow: สร้างใบเบิก CTW (เลือกสาขา + รายการ) → ตัดสต๊อก + SKU → กด "ส่งไป CTW"
   │  POST (Bearer CTW_API_KEY)
   ▼
CTW:       รับ payload → ลงสต๊อกสาขา / ปิดงานเอง → ตอบ 2xx
```

## สิ่งที่ CTW ต้องทำ: เปิด endpoint 1 ตัว รับ POST
ตั้ง 2 ค่าใน env ของ **stockflow** (Vercel):
- `CTW_WEBHOOK_URL` = URL endpoint ของระบบ CTW (เช่น `https://central.example.com/api/inbound/requisition`)
- `CTW_API_KEY` = คีย์ลับร่วม (สุ่ม `openssl rand -hex 24`)

stockflow จะยิง:
```
POST <CTW_WEBHOOK_URL>
Authorization: Bearer <CTW_API_KEY>
Content-Type: application/json
```
```json
{
  "po_no": "WPO260901003",
  "branch": "01_CTW - Central World",
  "doc_date": "2026-09-01",
  "items": [
    { "product": "Dream Island", "size": "50 ml", "qty": 2, "sku": "DID-50 ml" },
    { "product": "Secret of Peach", "size": "50 ml", "qty": 3, "sku": "SPH-50 ml" }
  ],
  "skus": [
    { "sku": "DID-50-000001", "product": "Dream Island", "size": "50 ml", "barcode": "8857128011300" }
  ]
}
```
- `items` = รายการรวม (product · ขนาด · จำนวน · **SKU รหัสสินค้า**)
- `skus` = **SKU รายชิ้น (serial)** ที่คลังตัดออกจริง — มีค่าเมื่อคลัง serialize สต๊อก (ถ้ายังไม่ทำ = ว่าง)
- ระบบ CTW ควรตอบ **HTTP 2xx** ถ้ารับสำเร็จ → stockflow จะปักธง "ส่งไป CTW แล้ว"
  (ตอบ error → stockflow แจ้งเตือน ให้กดส่งซ้ำได้)

## หมายเหตุ
- ยิงซ้ำ (กดส่งซ้ำ) ได้ — ระบบ CTW ควร idempotent ตาม `po_no` (po เดิม = อัปเดต ไม่สร้างซ้ำ)
- บาร์โค้ดสินค้า (8857128…) ตรงกันทั้งสองระบบแล้ว → CTW แมตช์กลิ่น/ขนาดจาก barcode หรือ sku ได้
