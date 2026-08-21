import { unzipSync, strFromU8 } from "fflate";

/**
 * Raw .xlsx reader (unzip + parse sheet XML ตรง ๆ) — ใช้เมื่อ ExcelJS อ่านไม่ออก.
 *
 * TikTok Shop export เขียน "ทุกเซลล์" เป็น `t="str"` (ปกติแปลว่า "ผลลัพธ์สูตร")
 * แต่ใส่แค่ <v> ไม่มี <f> → ExcelJS parser คืน null ทั้งแผ่น (อ่านได้ 2 จาก 88 แถว).
 * reader นี้ดึงค่าจาก <v> ตรง ๆ + รองรับ sharedStrings / inlineStr / number ด้วย
 * จึงใช้เป็น fallback ทั่วไปได้กับ xlsx แปลก ๆ.
 */
export type SheetRows = { headers: string[]; rows: Record<string, any>[] };

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function unescapeXml(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g, (m, e: string) => {
    if (e[0] === "#") { const cp = e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(cp) ? String.fromCodePoint(cp) : m; }
    return ENT[e] ?? m;
  });
}

/** "A"→1, "Z"→26, "AA"→27 … */
function colToIdx(letters: string): number {
  let n = 0;
  for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
  return n;
}

/** รวมข้อความจากทุก <t> ใน block (รองรับ rich-text runs และ xml:space="preserve") */
function collectText(block: string): string {
  let out = "";
  for (const tm of block.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) out += tm[1];
  return unescapeXml(out);
}

export function readXlsxRaw(buf: Buffer | Uint8Array): SheetRows {
  const files = unzipSync(buf instanceof Uint8Array ? buf : new Uint8Array(buf));

  // sharedStrings (ถ้ามี) — index → ข้อความ
  const sst: string[] = [];
  const sstFile = files["xl/sharedStrings.xml"];
  if (sstFile) {
    const xml = strFromU8(sstFile);
    for (const si of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) sst.push(collectText(si[1]));
  }

  // เลือก worksheet ที่มีเซลล์เยอะสุด (= แผ่นข้อมูล) — TikTok ตั้งชื่อไฟล์เป็น sheet2.xml
  let sheetXml = "", bestCells = -1;
  for (const name of Object.keys(files)) {
    if (!/^xl\/worksheets\/[^/]+\.xml$/.test(name)) continue;
    const xml = strFromU8(files[name]);
    const cells = (xml.match(/<c[ >]/g) || []).length;
    if (cells > bestCells) { bestCells = cells; sheetXml = xml; }
  }
  if (!sheetXml) return { headers: [], rows: [] };

  // grid[row][col] = ค่า string
  const grid = new Map<number, Map<number, string>>();
  let headerRowNo = Infinity;
  const cellRe = /<c\s+r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  for (const m of sheetXml.matchAll(cellRe)) {
    const col = colToIdx(m[1]);
    const row = parseInt(m[2], 10);
    const attrs = m[3] || "";
    const inner = m[4];
    if (inner == null || inner === "") continue;
    const t = (attrs.match(/\bt="([^"]+)"/) || [])[1];
    let val = "";
    if (t === "s") {
      const vi = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      val = vi != null ? (sst[parseInt(vi, 10)] ?? "") : "";
    } else if (t === "inlineStr") {
      val = collectText(inner);
    } else {
      const vi = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      val = vi != null ? unescapeXml(vi) : "";
    }
    if (val === "") continue;
    let r = grid.get(row);
    if (!r) { r = new Map(); grid.set(row, r); }
    r.set(col, val);
    if (row < headerRowNo) headerRowNo = row;
  }
  if (!grid.size) return { headers: [], rows: [] };

  // header = แถวแรกที่มีข้อมูล
  const headerMap = grid.get(headerRowNo)!;
  const maxCol = Math.max(...[...grid.values()].flatMap((r) => [...r.keys()]));
  const headers: string[] = [];
  for (let c = 1; c <= maxCol; c++) headers[c] = (headerMap.get(c) || "").trim();

  const rows: Record<string, any>[] = [];
  const sortedRows = [...grid.keys()].filter((rn) => rn > headerRowNo).sort((a, b) => a - b);
  for (const rn of sortedRows) {
    const r = grid.get(rn)!;
    const obj: Record<string, any> = {};
    let hasData = false;
    for (const [c, v] of r) {
      const h = headers[c];
      if (!h) continue;
      if (obj[h] == null || obj[h] === "") { obj[h] = v; hasData = true; }
    }
    if (hasData) rows.push(obj);
  }
  return { headers: headers.filter(Boolean), rows };
}
