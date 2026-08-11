import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
// PDF fonts are embedded (lib/pdf/fonts.ts, base64) so the print route needs no
// filesystem access — nothing to trace, and it renders on Cloudflare Workers too.
const nextConfig = {
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["@electric-sql/pglite"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
};
export default nextConfig;
