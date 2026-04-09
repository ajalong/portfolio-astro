/**
 * Generates favicon.svg + raster PNGs from Graphik outlines (opentype.js) + sharp.
 * Run: node scripts/generate-favicon.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const fontPath = path.join(publicDir, 'Graphik-Medium-Cy-Gr-Web.4600902d.woff');

const BG = '#BA5C26';
const FG = '#000000';
const VB = 128;
const PAD = 14;

async function main() {
  const font = await opentype.load(fontPath);
  const fontSize = 100;
  const p = font.getPath('AL', 0, 0, fontSize);
  const d = p.toPathData(2);
  const bb = p.getBoundingBox();
  const w = bb.x2 - bb.x1;
  const h = bb.y2 - bb.y1;
  const cx = (bb.x1 + bb.x2) / 2;
  const cy = (bb.y1 + bb.y2) / 2;
  const s = Math.min((VB - 2 * PAD) / w, (VB - 2 * PAD) / h);

  const transform = `translate(${VB / 2} ${VB / 2}) scale(${s} ${-s}) translate(${-cx} ${-cy})`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" width="${VB}" height="${VB}">
  <rect width="${VB}" height="${VB}" fill="${BG}"/>
  <g transform="${transform}">
    <path fill="${FG}" d="${d}"/>
  </g>
</svg>
`;

  const svgPath = path.join(publicDir, 'favicon.svg');
  fs.writeFileSync(svgPath, svg, 'utf8');
  console.log('Wrote', path.relative(root, svgPath));

  // Safari pinned tab: black glyph on transparent (tint comes from mask-icon color)
  const pinned = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}">
  <g transform="${transform}">
    <path fill="#000000" d="${d}"/>
  </g>
</svg>
`;
  const pinnedPath = path.join(publicDir, 'safari-pinned-tab.svg');
  fs.writeFileSync(pinnedPath, pinned, 'utf8');
  console.log('Wrote', path.relative(root, pinnedPath));

  const buf = Buffer.from(svg);
  const sizes = [
    ['favicon-16x16.png', 16],
    ['favicon-32x32.png', 32],
    ['apple-touch-icon.png', 180],
    ['android-chrome-192x192.png', 192],
    ['android-chrome-512x512.png', 512],
  ];

  for (const [name, size] of sizes) {
    const out = path.join(publicDir, name);
    await sharp(buf).resize(size, size).png().toFile(out);
    console.log('Wrote', path.relative(root, out));
  }

  const icoPath = path.join(publicDir, 'favicon.ico');
  await sharp(buf).resize(32, 32).png().toFile(path.join(publicDir, '_favicon-32-tmp.png'));
  const png32 = fs.readFileSync(path.join(publicDir, '_favicon-32-tmp.png'));
  fs.unlinkSync(path.join(publicDir, '_favicon-32-tmp.png'));

  // ICO: single 32x32 PNG embedded (works in most browsers)
  const ico = buildIcoFromPng(png32);
  fs.writeFileSync(icoPath, ico);
  console.log('Wrote', path.relative(root, icoPath));
}

/** Minimal ICO with one 32x32 PNG image */
function buildIcoFromPng(pngBuf) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count

  const w = 32;
  const h = 32;
  const entry = Buffer.alloc(16);
  entry.writeUInt8(w === 256 ? 0 : w, 0);
  entry.writeUInt8(h === 256 ? 0 : h, 1);
  entry.writeUInt8(0, 2); // no palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(pngBuf.length, 8); // size
  entry.writeUInt32LE(6 + 16, 12); // offset (after header + entry)

  return Buffer.concat([header, entry, pngBuf]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
