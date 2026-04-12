/**
 * Rasterizes the ::before mesh to public/mesh-bg.webp and bakes in film-style grain
 * (multi-scale noise + light chroma jitter), similar to the old SVG displacement filter
 * (feTurbulence + feDisplacementMap) but static — no runtime filter cost.
 *
 * Re-run: npm run build:mesh
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const OUT_WIDTH = 2048;

/** Tuned to approximate the old filter (scale ~52, 3 octaves, high baseFrequency). */
const GRAIN_FINE = 9;
const GRAIN_MED = 5;
const GRAIN_COARSE = 3.5;
const CHROMA_JITTER = 2.2;

/** Match html::before mesh: 5 elliptical radials on the extended backdrop box. */
const W = 1400;
const H = 1800;

function pos(xPct, yPct) {
  return { cx: (xPct / 100) * W, cy: (yPct / 100) * H };
}

function ellipseScale(wPct, hPct) {
  const sx = wPct / 100;
  const sy = (hPct / 100) * (H / W);
  return { sx, sy };
}

/** Deterministic 32-bit hash → stable “random” per pixel / block (reproducible builds). */
function hash2u(x, y, salt = 0) {
  let h = (x + salt * 374761393) * 1274126177 + (y + salt * 668265263) * 374761393;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

function unit(h) {
  return h / 0x100000000;
}

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Multi-octave value noise (3 scales) + light per-channel jitter — breaks 8-bit banding
 * without visibly “snowing” the image.
 */
function applyBakedGrain(data, width, height, channels) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const uf = unit(hash2u(x, y, 1)) - 0.5;
      const um = unit(hash2u((x / 3) | 0, (y / 3) | 0, 2)) - 0.5;
      const uc = unit(hash2u((x / 9) | 0, (y / 9) | 0, 3)) - 0.5;
      const g = uf * GRAIN_FINE + um * GRAIN_MED + uc * GRAIN_COARSE;
      const jr = (unit(hash2u(x, y, 4)) - 0.5) * CHROMA_JITTER;
      const jg = (unit(hash2u(x, y, 5)) - 0.5) * CHROMA_JITTER;
      const jb = (unit(hash2u(x, y, 6)) - 0.5) * CHROMA_JITTER;
      data[i] = clamp(data[i] + g + jr);
      data[i + 1] = clamp(data[i + 1] + g + jg);
      data[i + 2] = clamp(data[i + 2] + g + jb);
    }
  }
}

function stopsXml(stops) {
  return stops
    .map(([offset, color]) => `    <stop offset="${offset}" stop-color="${color}"/>`)
    .join('\n');
}

const layers = [
  {
    id: 'mesh5',
    ellipse: [220, 120],
    at: [50, 110],
    stops: [
      ['0%', 'hsl(258 24% 82% / 0.36)'],
      ['13%', 'hsl(257 24% 82.5% / 0.31)'],
      ['18%', 'hsl(256 24% 83% / 0.26)'],
      ['23%', 'hsl(44 24% 84% / 0.22)'],
      ['28%', 'hsl(32 24% 85% / 0.18)'],
      ['33%', 'hsl(30 22% 86% / 0.14)'],
      ['38%', 'hsl(28 20% 87% / 0.1)'],
      ['43%', 'hsl(256 17% 88.5% / 0.09)'],
      ['48%', 'hsl(256 14% 90% / 0.08)'],
      ['54%', 'hsl(258 13% 91% / 0.055)'],
      ['60%', 'hsl(260 12% 92% / 0.03)'],
      ['71%', 'transparent'],
    ],
  },
  {
    id: 'mesh4',
    ellipse: [115, 95],
    at: [30, -6],
    stops: [
      ['0%', 'hsl(248 28% 85% / 0.36)'],
      ['13%', 'hsl(249 26% 86% / 0.31)'],
      ['22%', 'hsl(250 24% 87% / 0.26)'],
      ['28%', 'hsl(251 23% 88% / 0.22)'],
      ['34%', 'hsl(252 22% 89% / 0.18)'],
      ['39%', 'hsl(253 20% 89.5% / 0.14)'],
      ['44%', 'hsl(254 18% 90% / 0.1)'],
      ['48%', 'hsl(255 17% 91% / 0.08)'],
      ['52%', 'hsl(256 16% 92% / 0.06)'],
      ['57%', 'hsl(257 15% 92.5% / 0.045)'],
      ['62%', 'hsl(258 14% 93% / 0.03)'],
      ['69%', 'transparent'],
    ],
  },
  {
    id: 'mesh3',
    ellipse: [105, 95],
    at: [100, 0],
    stops: [
      ['0%', 'hsl(28 44% 81% / 0.46)'],
      ['11%', 'hsl(27 41% 82% / 0.4)'],
      ['18%', 'hsl(26 38% 83% / 0.34)'],
      ['23%', 'hsl(24 36% 84% / 0.3)'],
      ['28%', 'hsl(22 34% 85% / 0.26)'],
      ['33%', 'hsl(20 31% 86% / 0.21)'],
      ['38%', 'hsl(18 28% 87% / 0.16)'],
      ['43%', 'hsl(17 26% 88% / 0.135)'],
      ['48%', 'hsl(16 24% 89% / 0.11)'],
      ['53%', 'hsl(15 22% 90% / 0.075)'],
      ['58%', 'hsl(14 20% 91% / 0.04)'],
      ['66%', 'transparent'],
    ],
  },
  {
    id: 'mesh2',
    ellipse: [110, 100],
    at: [0, 100],
    stops: [
      ['0%', 'hsl(22 54% 78% / 0.7)'],
      ['6%', 'hsl(22 51% 79% / 0.64)'],
      ['12%', 'hsl(22 48% 80% / 0.58)'],
      ['17%', 'hsl(21 46% 81% / 0.53)'],
      ['22%', 'hsl(20 44% 82% / 0.48)'],
      ['27%', 'hsl(19 41% 83% / 0.43)'],
      ['32%', 'hsl(18 38% 84% / 0.38)'],
      ['36%', 'hsl(17 36% 85% / 0.33)'],
      ['40%', 'hsl(16 34% 86% / 0.28)'],
      ['44%', 'hsl(15 31% 87% / 0.23)'],
      ['48%', 'hsl(14 28% 88% / 0.18)'],
      ['52%', 'hsl(13 25% 89% / 0.145)'],
      ['56%', 'hsl(12 22% 90% / 0.11)'],
      ['60%', 'hsl(11 20% 91% / 0.075)'],
      ['64%', 'hsl(10 18% 92% / 0.04)'],
      ['72%', 'transparent'],
    ],
  },
  {
    id: 'mesh1',
    ellipse: [130, 115],
    at: [100, 100],
    stops: [
      ['0%', 'hsl(268 42% 76% / 0.8)'],
      ['9%', 'hsl(271 40% 77.5% / 0.71)'],
      ['12%', 'hsl(274 38% 79% / 0.62)'],
      ['15%', 'hsl(276 36% 80% / 0.58)'],
      ['18%', 'hsl(278 34% 81% / 0.54)'],
      ['21%', 'hsl(280 32% 82% / 0.48)'],
      ['27%', 'hsl(283 30% 83% / 0.42)'],
      ['34%', 'hsl(288 28% 85% / 0.34)'],
      ['39%', 'hsl(290 25% 86% / 0.27)'],
      ['44%', 'hsl(292 22% 87% / 0.2)'],
      ['50%', 'hsl(295 18% 89% / 0.14)'],
      ['57%', 'hsl(296 17% 89.5% / 0.105)'],
      ['62%', 'hsl(298 15% 90% / 0.07)'],
      ['71%', 'transparent'],
    ],
  },
];

function radialDef(layer) {
  const { cx, cy } = pos(layer.at[0], layer.at[1]);
  const { sx, sy } = ellipseScale(layer.ellipse[0], layer.ellipse[1]);
  return `
  <radialGradient id="${layer.id}" cx="${cx}" cy="${cy}" r="${W}" gradientUnits="userSpaceOnUse"
    gradientTransform="translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})">
${stopsXml(layer.stops)}
  </radialGradient>`;
}

function buildSvg() {
  const defs = layers.map(radialDef).join('\n');
  const rects = [...layers].reverse().map((layer) => {
    return `  <rect width="${W}" height="${H}" fill="url(#${layer.id})"/>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
  <defs>${defs}
  </defs>
${rects.join('\n')}
</svg>`;
}

const svg = buildSvg();
const outWebp = join(publicDir, 'mesh-bg.webp');
const outHeight = Math.round((OUT_WIDTH * H) / W);

const { data, info } = await sharp(Buffer.from(svg))
  .resize(OUT_WIDTH, outHeight)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

applyBakedGrain(data, info.width, info.height, info.channels);

await sharp(Buffer.from(data), {
  raw: {
    width: info.width,
    height: info.height,
    channels: info.channels,
  },
})
  .webp({ quality: 90, effort: 5, smartSubsample: false })
  .toFile(outWebp);

writeFileSync(join(publicDir, 'mesh-bg.svg'), svg);
console.log(
  `Wrote ${outWebp} and mesh-bg.svg (${W}×${H} → ${info.width}×${info.height}, baked grain)`
);
