// Regenerate lib/pdf/fonts.ts from public/fonts/*.ttf.
// The PDF route embeds the Thai font as base64 (no fs/process.cwd() at runtime)
// so react-pdf works on Cloudflare Workers as well as Node. Run after changing fonts:
//   node scripts/gen-fonts.mjs
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const b64 = (f) => readFileSync(path.join(root, "public", "fonts", f)).toString("base64");
const out = `// AUTO-GENERATED from public/fonts/*.ttf — do not edit by hand.
// Fonts embedded as base64 data URIs so the PDF route needs NO filesystem/process.cwd()
// access — works identically on Node (Vercel) and Cloudflare Workers (nodejs_compat).
// Regenerate: node scripts/gen-fonts.mjs
export const NOTO_SANS_THAI_REGULAR = "data:font/ttf;base64,${b64("NotoSansThai-Regular.ttf")}";
export const NOTO_SANS_THAI_BOLD = "data:font/ttf;base64,${b64("NotoSansThai-Bold.ttf")}";
`;
writeFileSync(path.join(root, "lib", "pdf", "fonts.ts"), out);
console.log("wrote lib/pdf/fonts.ts");
