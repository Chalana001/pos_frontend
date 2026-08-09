import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const distDir = resolve("dist");
const html = await readFile(resolve(distDir, "index.html"), "utf8");
const entryMatch = html.match(/<script[^>]+src="([^"]+\.js)"/);

if (!entryMatch) {
  throw new Error("Unable to find the production entry script in dist/index.html");
}

const assets = await readdir(resolve(distDir, "assets"));
const entryName = entryMatch[1].split("/").pop();
const entryContent = await readFile(resolve(distDir, "assets", entryName));
const entryGzipKb = gzipSync(entryContent).byteLength / 1024;
const maxEntryGzipKb = Number(process.env.BUNDLE_MAX_ENTRY_GZIP_KB || 65);
const startupChunkPatterns = [/^index-[^.]+\.js$/, /^react-vendor-.*\.js$/, /^app-vendor-.*\.js$/, /^toast-vendor-.*\.js$/, /^icons-vendor-.*\.js$/];
const startupChunks = assets.filter((name) => startupChunkPatterns.some((pattern) => pattern.test(name)));
const startupMetrics = await Promise.all(startupChunks.map(async (name) => {
  const content = await readFile(resolve(distDir, "assets", name));
  return { name, gzipKb: gzipSync(content).byteLength / 1024 };
}));
const startupGzipKb = startupMetrics.reduce((total, asset) => total + asset.gzipKb, 0);
const maxStartupGzipKb = Number(process.env.BUNDLE_MAX_STARTUP_GZIP_KB || 260);
const maxChunkGzipKb = Number(process.env.BUNDLE_MAX_CHUNK_GZIP_KB || 135);
const oversizedChunks = startupMetrics.filter((asset) => asset.gzipKb > maxChunkGzipKb);
const entrySource = entryContent.toString("utf8");
const forbiddenInitialPatterns = [/html2canvas-vendor/i, /pdf-vendor/i, /charts-vendor/i];
const forbiddenInitial = forbiddenInitialPatterns.filter((pattern) => pattern.test(entrySource));

console.log(`Entry: ${entryName}`);
console.log(`Entry gzip: ${entryGzipKb.toFixed(2)} KB (budget ${maxEntryGzipKb} KB)`);
console.log(`Startup gzip: ${startupGzipKb.toFixed(2)} KB (budget ${maxStartupGzipKb} KB)`);
startupMetrics.forEach((asset) => console.log(`- ${asset.name}: ${asset.gzipKb.toFixed(2)} KB gzip`));
console.log(`Generated assets: ${assets.length}`);

if (
  entryGzipKb > maxEntryGzipKb
  || startupGzipKb > maxStartupGzipKb
  || oversizedChunks.length > 0
  || forbiddenInitial.length > 0
) {
  process.exitCode = 1;
}
