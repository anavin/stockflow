import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
// The withdrawal PDF (react-pdf) reads the Thai font from /public via
// path.join(process.cwd(), ...). Force those files into the print route bundle.
const PDF_ASSETS = ["./public/fonts/*.ttf"];

const nextConfig = {
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    "/api/print/[orderNo]": PDF_ASSETS,
  },
  serverExternalPackages: ["@electric-sql/pglite"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
};
export default nextConfig;
