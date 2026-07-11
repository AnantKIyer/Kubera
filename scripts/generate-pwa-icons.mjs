/**
 * Generates PWA icon PNGs per currency from the Kubera brand SVG.
 * Run: node scripts/generate-pwa-icons.mjs
 *
 * Glyphs are rendered, trimmed, then composited into the green squircle
 * so optical centering does not depend on SVG text baselines.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
mkdirSync(iconsDir, { recursive: true });

const CANVAS = 512;
const CORNER_RX = 112;
const FILL = "#367a56";
const GLYPH_FILL = "#faf9f6";
/** Max glyph box as a fraction of canvas (maskable-safe). */
const MAX_GLYPH_RATIO = 0.52;
/**
 * Small per-glyph optical nudges (px on 512 canvas) after geometric centering.
 * Positive y shifts the glyph down.
 */
const CURRENCIES = [
  { code: "INR", glyph: "₹", fontSize: 300, nudgeY: 14 },
  { code: "USD", glyph: "$", fontSize: 320, nudgeY: 4 },
  { code: "EUR", glyph: "€", fontSize: 300, nudgeY: 4 },
  { code: "GBP", glyph: "£", fontSize: 300, nudgeY: 10 },
  { code: "AED", glyph: "د", fontSize: 300, nudgeY: 8 },
  { code: "SGD", glyph: "S$", fontSize: 230, nudgeY: 4 },
  { code: "CAD", glyph: "C$", fontSize: 230, nudgeY: 4 },
  { code: "AUD", glyph: "A$", fontSize: 230, nudgeY: 4 },
  { code: "JPY", glyph: "¥", fontSize: 300, nudgeY: 8 },
  { code: "CHF", glyph: "Fr", fontSize: 220, nudgeY: 2 },
];

const SIZES = [180, 192, 512];

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function glyphSvg({ glyph, fontSize }) {
  // Oversized transparent canvas so nothing clips while measuring.
  const pad = Math.ceil(fontSize * 1.5);
  const size = pad * 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <text
    x="50%"
    y="50%"
    text-anchor="middle"
    dominant-baseline="central"
    font-size="${fontSize}"
    fill="${GLYPH_FILL}"
    font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
    font-weight="600"
  >${escapeXml(glyph)}</text>
</svg>`);
}

function backgroundSvg() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  <rect width="${CANVAS}" height="${CANVAS}" rx="${CORNER_RX}" fill="${FILL}"/>
</svg>`);
}

async function renderIcon({ glyph, fontSize, nudgeY }) {
  const raw = await sharp(glyphSvg({ glyph, fontSize })).png().toBuffer();
  const trimmed = await sharp(raw).trim({ threshold: 10 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const gw = meta.width ?? 1;
  const gh = meta.height ?? 1;

  const maxSide = Math.round(CANVAS * MAX_GLYPH_RATIO);
  const scale = Math.min(1, maxSide / Math.max(gw, gh));
  const tw = Math.max(1, Math.round(gw * scale));
  const th = Math.max(1, Math.round(gh * scale));

  const glyphPng = await sharp(trimmed).resize(tw, th).png().toBuffer();
  const left = Math.round((CANVAS - tw) / 2);
  const top = Math.round((CANVAS - th) / 2 + nudgeY);

  return sharp(backgroundSvg())
    .composite([{ input: glyphPng, left, top }])
    .png()
    .toBuffer();
}

for (const currency of CURRENCIES) {
  const dir = join(iconsDir, currency.code);
  mkdirSync(dir, { recursive: true });
  const master = await renderIcon(currency);

  for (const size of SIZES) {
    const out = join(dir, `icon-${size}.png`);
    await sharp(master).resize(size, size).png().toFile(out);
    console.log(`Wrote public/icons/${currency.code}/icon-${size}.png`);
  }
}

for (const size of SIZES) {
  const src = join(iconsDir, "INR", `icon-${size}.png`);
  const dest = join(iconsDir, `icon-${size}.png`);
  copyFileSync(src, dest);
  console.log(`Wrote public/icons/icon-${size}.png (INR)`);
}
