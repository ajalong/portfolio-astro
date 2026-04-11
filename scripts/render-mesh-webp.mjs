/**
 * Rasterize scripts/mesh-bg-source.svg → public/mesh-bg.webp
 * (Recreates the former animated mesh palette as a static asset.)
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, 'mesh-bg-source.svg');
const outPath = join(__dirname, '../public/mesh-bg.webp');

const svg = readFileSync(svgPath);

await sharp(svg, { density: 144 })
  .webp({ quality: 88, effort: 6 })
  .toFile(outPath);

console.log('Wrote', outPath);
