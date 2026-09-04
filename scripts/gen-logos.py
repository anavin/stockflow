# สร้าง lib/pdf/logos.ts (data URI) จากไฟล์โลโก้ — ตัดขอบขาว + ย่อ
# ใช้: python3 scripts/gen-logos.py <lab-logo> <eveandboy-logo>
import sys, base64, io
from PIL import Image, ImageChops
def trim_white(im):
    im = im.convert("RGB"); bg = Image.new("RGB", im.size, (255,255,255))
    bb = ImageChops.difference(im, bg).getbbox(); return im.crop(bb) if bb else im
def datauri(im, w):
    h = round(im.size[1]*w/im.size[0]); im = im.resize((w,h), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf,"PNG",optimize=True)
    return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}", round(im.size[0]/im.size[1],4)
lab = sys.argv[1] if len(sys.argv)>1 else "/Users/anavinst/Downloads/LAB-PARFUMO-LOGO-.jpg"
eve = sys.argv[2] if len(sys.argv)>2 else "/Users/anavinst/Downloads/eveandboy-logo-01.png"
lu,la = datauri(trim_white(Image.open(lab)), 700)
eu,ea = datauri(Image.open(eve).convert("RGB"), 450)
open("lib/pdf/logos.ts","w").write(
f'''// โลโก้แบรนด์ (data URI) สำหรับหัวกระดาษ PDF — สร้างจาก scripts/gen-logos.py
export const LAB_PARFUMO_LOGO = "{lu}";
export const LAB_PARFUMO_AR = {la};
export const EVEANDBOY_LOGO = "{eu}";
export const EVEANDBOY_AR = {ea};
''')
print("✓ lib/pdf/logos.ts")
