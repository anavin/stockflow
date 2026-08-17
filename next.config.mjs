import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
// PDF fonts are embedded (lib/pdf/fonts.ts, base64) so the print route needs no
// filesystem access — nothing to trace, and it renders on Cloudflare Workers too.
const nextConfig = {
  outputFileTracingRoot: __dirname,
  // @sparticuz/chromium ต้อง externalize ไม่ให้ Next.js bundle/ย้ายไฟล์ ไม่งั้นโฟลเดอร์ bin (Chromium)
  // หายตอน runtime บน Vercel → พิมพ์ PDF ไม่ได้ ("input directory .../bin does not exist")
  serverExternalPackages: ["@electric-sql/pglite", "@sparticuz/chromium", "puppeteer-core"],
  // file-tracer มองไม่เห็นไฟล์ Chromium (bin/*.br โหลดตอน runtime ผ่าน path ไม่ใช่ import)
  // → บังคับ copy เข้า serverless function ของ route ที่พิมพ์ PDF เอง ไม่งั้น bin หาย
  outputFileTracingIncludes: {
    "/api/print/[orderNo]": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/print-bulk": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
};
export default nextConfig;
