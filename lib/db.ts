/**
 * Dual database layer.
 *  - Local dev: embedded Postgres (PGlite) persisted to ./.pgdata — `npm run dev`
 *    works with zero cloud setup, auto-migrates + seeds on first run.
 *  - Production: set DATABASE_URL to the Supabase Postgres connection string.
 *    The SQL is identical Postgres both ways; nothing else in the app changes.
 *
 * All app code queries through q(). Reads auto-retry on transient errors; writes
 * never auto-retry (a lost ack could duplicate a row).
 */
import type { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, ".pgdata");
const MIG_DIR = path.join(ROOT, "migrations");
const SEED_DIR = path.join(ROOT, "seed");

function usePg() {
  return !!process.env.DATABASE_URL;
}

// ---------------------------------------------------------------------------
// PGlite (local dev)
// ---------------------------------------------------------------------------
type G = { _pg?: Promise<PGlite> };
const g = globalThis as unknown as G;

async function migrate(db: PGlite) {
  const files = (await readdir(MIG_DIR)).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = await readFile(path.join(MIG_DIR, f), "utf8");
    await db.exec(sql);
  }
}

async function loadSeed<T = any>(name: string): Promise<T[]> {
  try {
    return JSON.parse(await readFile(path.join(SEED_DIR, `${name}.json`), "utf8"));
  } catch {
    return [];
  }
}

async function insertRows(db: PGlite, table: string, cols: string[], rows: any[][], onConflict = "") {
  if (rows.length === 0) return;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const values: any[] = [];
    const tuples = slice.map((row) => {
      const ph = row.map((_, j) => `$${values.length + j + 1}`);
      values.push(...row);
      return `(${ph.join(",")})`;
    });
    await db.query(
      `insert into ${table} (${cols.join(",")}) values ${tuples.join(",")} ${onConflict}`,
      values,
    );
  }
}

async function isEmpty(db: PGlite) {
  const r = await db.query<{ n: number }>("select count(*)::int as n from products");
  return r.rows[0].n === 0;
}

async function seed(db: PGlite) {
  const platforms = await loadSeed("platforms");
  await insertRows(db, "platforms", ["code", "name", "prefix", "sort"],
    platforms.map((p) => [p.code, p.name, p.prefix, p.sort]), "on conflict do nothing");

  const products = await loadSeed("products");
  await insertRows(db, "products", ["name", "sort"],
    products.map((p) => [p.name, p.sort ?? 0]), "on conflict do nothing");

  const sizes = await loadSeed("sizes");
  await insertRows(db, "sizes", ["label", "ml", "sort"],
    sizes.map((s) => [s.label, s.ml, s.sort]), "on conflict do nothing");

  const postcodes = await loadSeed("postcodes");
  await insertRows(db, "postcodes", ["province", "district", "postcode"],
    postcodes.map((p) => [p.province, p.district, p.postcode]), "on conflict do nothing");
}

async function ensureAdmin(db: { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> }) {
  const [{ n }] = (await db.query("select count(*)::int n from users")).rows as { n: number }[];
  if (n > 0) return;
  const { randomBytes } = await import("node:crypto");
  const { hashBcrypt } = await import("./auth/password");
  const username = (process.env.ADMIN_USERNAME || "admin").trim();
  let pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    pw = randomBytes(9).toString("base64url").replace(/[^a-zA-Z0-9]/g, "") + "9a";
    console.log(`\n[auth] ADMIN_PASSWORD not set — created admin "${username}" with a random password:\n        ${pw}\n        (set ADMIN_PASSWORD in .env.local to control it)\n`);
  }
  await db.query(
    `insert into users (username, password_hash, full_name, role) values ($1,$2,$3,'admin')`,
    [username, await hashBcrypt(pw), "ผู้ดูแลระบบ"]);
}

async function ensureThaiPostcodes(db: PGlite) {
  try {
    const [{ n }] = (await db.query("select count(*)::int n from thai_postcodes")).rows as { n: number }[];
    if (n > 0) return;
    const rows = await loadSeed("thai_postcodes");
    if (!rows.length) return;
    console.log(`[db] seeding thai_postcodes (${rows.length} rows) …`);
    await insertRows(db, "thai_postcodes", ["province", "district", "subdistrict", "postcode"],
      rows.map((r) => [r.province, r.district, r.subdistrict, r.postcode]), "");
  } catch { /* ตารางยังไม่มี = ข้าม (migration จะสร้างให้รอบถัดไป) */ }
}

async function init(): Promise<PGlite> {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(DATA_DIR);
  await db.waitReady;
  await migrate(db);
  if (await isEmpty(db)) {
    console.log("[db] empty — seeding from ./seed …");
    await seed(db);
    console.log("[db] seed complete");
  }
  await ensureThaiPostcodes(db);   // ตำบลทั้งประเทศ — seed แยก (แม้ DB เดิมมีข้อมูลอยู่แล้ว)
  await ensureAdmin(db);
  return db;
}

function getDb(): Promise<PGlite> {
  if (!g._pg) g._pg = init();
  return g._pg;
}

// ---------------------------------------------------------------------------
// Postgres (Supabase, production)
// ---------------------------------------------------------------------------

/** TLS config for the pg pool.
 *  - If DATABASE_CA_CERT is set (PEM), verify against it (recommended for prod).
 *  - Else if PGSSL_NO_VERIFY=1, skip verification (last resort — e.g. pooler cert
 *    not in the trust store). Otherwise use default TLS with full verification. */
function pgSsl(): any {
  const ca = process.env.DATABASE_CA_CERT;
  if (ca && ca.trim()) return { ca, rejectUnauthorized: true };
  if (process.env.PGSSL_NO_VERIFY === "1") return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

/** Resolve the pg connection config.
 *  - Cloudflare Workers: prefer the **Hyperdrive** binding — Workers can't open a
 *    raw TCP socket to Supabase, so Hyperdrive proxies/pools the connection. The
 *    Worker→Hyperdrive hop is local plaintext (ssl:false); Hyperdrive→DB does TLS.
 *    search_path is set at the DATABASE level (ALTER DATABASE … SET search_path)
 *    so it works even though Hyperdrive doesn't forward the `options` startup param.
 *  - Otherwise (Vercel/Node, or dev-pg): use DATABASE_URL directly with TLS +
 *    per-connection search_path via the `options` startup param. */
async function resolveDbConfig(): Promise<{ connectionString?: string; ssl: any; options?: string }> {
  const { APP_KEY } = await import("./config");
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const env: any = (getCloudflareContext() as any)?.env;
    const cs: string | undefined = env?.HYPERDRIVE?.connectionString;
    if (cs) return { connectionString: cs, ssl: false };
  } catch {
    /* not running on Workers / no Hyperdrive binding — fall through */
  }
  return { connectionString: process.env.DATABASE_URL, ssl: pgSsl(), options: `-c search_path=${APP_KEY},public` };
}

// On Vercel/Node a persistent Pool is the fast, correct choice — connections are
// reused across warm invocations (no per-request connect/TLS latency) and concurrent
// queries run in parallel. (The per-request-Client approach was only to survive
// Cloudflare Workers' isolate model, which we no longer target.)
type GP = { _pgPool?: any };
const gp = globalThis as unknown as GP;
async function getPool(): Promise<any> {
  if (!gp._pgPool) {
    const { Pool, types } = await import("pg");
    types.setTypeParser(20, (v: string | null) => (v == null ? null : parseInt(v, 10))); // bigint→number
    types.setTypeParser(1082, (v: string | null) => v); // date→string
    const cfg = await resolveDbConfig();
    // Vercel serverless เปิดหลาย instance แต่ละตัวมี Pool ของตัวเอง → รวมกันต้องไม่เกิน
    // Supabase Session pooler (ฟรี = pool_size 15) · max เล็ก + คืน idle เร็ว กัน EMAXCONNSESSION
    gp._pgPool = new Pool({
      connectionString: cfg.connectionString,
      ssl: cfg.ssl,
      max: Number(process.env.PG_POOL_MAX || 3),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
      ...(cfg.options ? { options: cfg.options } : {}),
    });
    gp._pgPool.on("error", (e: any) => console.error("[pg pool] idle client error:", e?.message));
    await pgBootstrapOnce(gp._pgPool);
  }
  return gp._pgPool;
}

/** Ensure an admin exists (once per process). Schema/tables come from the Supabase
 *  SQL file; here we only bootstrap the admin so a fresh DB is usable. */
type GB = { _pgBoot?: Promise<void> };
const gb = globalThis as unknown as GB;
function pgBootstrapOnce(pool: any): Promise<void> {
  if (!gb._pgBoot) {
    gb._pgBoot = (async () => {
      try {
        await ensureAdmin(pool);
      } catch (e: any) {
        console.warn("[pg bootstrap] ensureAdmin skipped:", e?.message);
      }
    })();
  }
  return gb._pgBoot;
}

function isTransientDbError(e: any): boolean {
  const code = e?.code;
  if (["57P01", "57P03", "53300", "08006", "08003", "08001", "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EPIPE"].includes(code)) return true;
  return /terminat|connection|timeout|reset by peer|server closed|too many clients|ECONNRESET|socket hang up/i.test(String(e?.message || ""));
}

function isRetryableStatement(sql: string): boolean {
  return /^\s*(select|with)\b/i.test(sql) && !/\b(insert|update|delete)\b/i.test(sql);
}

/** Run a query and return rows. */
export async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (usePg()) {
    const pool = await getPool();
    const MAX = isRetryableStatement(sql) ? 3 : 1;
    let lastErr: any;
    for (let attempt = 0; attempt < MAX; attempt++) {
      try {
        const r = await pool.query(sql, params);
        return r.rows as T[];
      } catch (e) {
        lastErr = e;
        if (attempt === MAX - 1 || !isTransientDbError(e)) throw e;
        await new Promise((res) => setTimeout(res, 250 * (attempt + 1)));
      }
    }
    throw lastErr;
  }
  const db = await getDb();
  const r = await db.query<T>(sql, params);
  return r.rows;
}

/** Run several statements atomically. cb receives a scoped runner. */
export async function tx<T>(cb: (run: <R = any>(sql: string, params?: any[]) => Promise<R[]>) => Promise<T>): Promise<T> {
  if (usePg()) {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("begin");
      const run = async <R = any>(sql: string, params: any[] = []) => (await client.query(sql, params)).rows as R[];
      const out = await cb(run);
      await client.query("commit");
      return out;
    } catch (e) {
      await client.query("rollback").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }
  // PGlite: single-connection; wrap in a transaction block.
  const db = await getDb();
  await db.query("begin");
  try {
    const run = async <R = any>(sql: string, params: any[] = []) => (await db.query<any>(sql, params)).rows as R[];
    const out = await cb(run);
    await db.query("commit");
    return out;
  } catch (e) {
    await db.query("rollback").catch(() => {});
    throw e;
  }
}
