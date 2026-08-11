import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext → Cloudflare Workers adapter config.
// Minimal setup: no incremental cache needed (all pages are dynamic / force-dynamic).
export default defineCloudflareConfig({});
