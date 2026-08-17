/* NINE63 MUSIC — sitemap.xml generator.
 * Usage:  node tools/sitemap.mjs [base-url]
 * Base URL defaults to the NINE63_SITE_URL env var or http://localhost:8080.
 * Writes sitemap.xml in the project root.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const base = (process.argv[2] || process.env.NINE63_SITE_URL || "http://localhost:8080").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("[sitemap] base URL must start with http(s)://");
  process.exit(1);
}

const src = readFileSync(path.join(ROOT, "data", "beats.js"), "utf8");
const marker = "window.ACLASS_DATA = ";
const body = src.slice(src.indexOf(marker) + marker.length).trim().replace(/;\s*$/, "");
const data = Function("window", "return (" + body + ")")();

const routes = ["/", "/beats", "/genres", "/moods", "/licenses", "/about"];

for (const f of data.folders || []) routes.push("/collection/" + f.slug);
for (const g of data.genres || []) routes.push("/genre/" + g.slug);
for (const m of data.moods || []) routes.push("/mood/" + m.slug);
for (const b of data.beats || []) routes.push("/beat/" + b.slug);

const today = new Date().toISOString().slice(0, 10);
const url = (loc, prio) =>
  `  <url>\n    <loc>${base}/${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${prio}</priority>\n  </url>`;

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  url("", "1.0") +
  "\n" +
  url("beats", "0.9") +
  "\n" +
  routes
    .filter((r) => r && r !== "/" && r !== "/beats")
    .map((r) => url(r.slice(1), "0.8"))
    .join("\n") +
  "\n</urlset>\n";

writeFileSync(path.join(ROOT, "sitemap.xml"), xml);
console.log(`[sitemap] ${base}  →  sitemap.xml (${routes.length} routes)`);
