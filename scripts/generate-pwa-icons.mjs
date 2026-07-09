/**
 * Generates PWA icon PNGs from the Kubera brand SVG.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
mkdirSync(iconsDir, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#367a56"/>
  <text x="256" y="278" text-anchor="middle" font-size="280" fill="#faf9f6" font-family="system-ui, -apple-system, sans-serif" font-weight="600">&#8377;</text>
</svg>`;

const sizes = [180, 192, 512];

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(iconsDir, `icon-${size}.png`));
  console.log(`Wrote public/icons/icon-${size}.png`);
}
