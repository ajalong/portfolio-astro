/**
 * Builds all favicon assets from public/favicon-source.png (design export).
 * Run: npm run generate:favicon
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const sourcePath = path.join(publicDir, 'favicon-source.png');

/** Minimal ICO with one 32×32 PNG */
function buildIcoFromPng(pngBuf) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const w = 32;
  const h = 32;
  const entry = Buffer.alloc(16);
  entry.writeUInt8(w === 256 ? 0 : w, 0);
  entry.writeUInt8(h === 256 ? 0 : h, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuf.length, 8);
  entry.writeUInt32LE(6 + 16, 12);

  return Buffer.concat([header, entry, pngBuf]);
}

async function pngBuf(size) {
  return sharp(sourcePath)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(sourcePath)) {
    console.error('Missing', sourcePath);
    process.exit(1);
  }

  const outputs = [
    ['favicon-16x16.png', 16],
    ['favicon-32x32.png', 32],
    ['apple-touch-icon.png', 180],
    ['android-chrome-192x192.png', 192],
    ['android-chrome-512x512.png', 512],
  ];

  for (const [name, size] of outputs) {
    const out = path.join(publicDir, name);
    await sharp(sourcePath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(out);
    console.log('Wrote', path.relative(root, out));
  }

  const buf32 = await pngBuf(32);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buildIcoFromPng(buf32));
  console.log('Wrote public/favicon.ico');

  const buf128 = await pngBuf(128);
  const b64 = buf128.toString('base64');

  const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 128 128" width="128" height="128">
  <image href="data:image/png;base64,${b64}" width="128" height="128" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg, 'utf8');
  console.log('Wrote public/favicon.svg');

  fs.writeFileSync(path.join(publicDir, 'safari-pinned-tab.svg'), faviconSvg, 'utf8');
  console.log('Wrote public/safari-pinned-tab.svg');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
