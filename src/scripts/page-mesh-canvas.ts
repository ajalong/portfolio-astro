/**
 * Full-viewport mesh backdrop drawn to canvas (supersampled) to reduce visible
 * gradient banding vs CSS-only radials. Mirrors global.scss mesh layers.
 */

const CANVAS_ID = 'page-mesh-canvas';
const INSET = 1.12; // ~CSS inset -6% each axis → 112% viewport
const SUPERSAMPLE = 2; // internal pixel scale (on top of DPR)

type Vec2 = [number, number];

interface RadialDef {
  /** ellipse radii as % of layer tile width / height (CSS semantics) */
  ellipsePct: Vec2;
  /** gradient center within tile, 0–1 */
  anchor: Vec2;
  stops: { pos: number; h: number; s: number; l: number; a: number }[];
}

const LAYERS: RadialDef[] = [
  {
    ellipsePct: [130, 115],
    anchor: [1, 1],
    stops: [
      { pos: 0, h: 268, s: 34, l: 78, a: 0.72 },
      { pos: 0.18, h: 278, s: 28, l: 82, a: 0.48 },
      { pos: 0.34, h: 288, s: 22, l: 86, a: 0.28 },
      { pos: 0.5, h: 295, s: 16, l: 90, a: 0.12 },
      { pos: 0.72, h: 295, s: 16, l: 90, a: 0 },
    ],
  },
  {
    ellipsePct: [110, 100],
    anchor: [0, 1],
    stops: [
      { pos: 0, h: 24, s: 48, l: 79, a: 0.64 },
      { pos: 0.22, h: 20, s: 40, l: 83, a: 0.42 },
      { pos: 0.4, h: 16, s: 30, l: 87, a: 0.22 },
      { pos: 0.56, h: 12, s: 20, l: 91, a: 0.09 },
      { pos: 0.72, h: 12, s: 20, l: 91, a: 0 },
    ],
  },
  {
    ellipsePct: [105, 95],
    anchor: [1, 0],
    stops: [
      { pos: 0, h: 28, s: 38, l: 82, a: 0.4 },
      { pos: 0.28, h: 22, s: 30, l: 86, a: 0.22 },
      { pos: 0.48, h: 16, s: 22, l: 90, a: 0.09 },
      { pos: 0.66, h: 16, s: 22, l: 90, a: 0 },
    ],
  },
  {
    ellipsePct: [115, 95],
    anchor: [0.3, -0.06],
    stops: [
      { pos: 0, h: 248, s: 22, l: 86, a: 0.3 },
      { pos: 0.34, h: 252, s: 18, l: 90, a: 0.14 },
      { pos: 0.52, h: 256, s: 14, l: 93, a: 0.05 },
      { pos: 0.68, h: 256, s: 14, l: 93, a: 0 },
    ],
  },
  {
    ellipsePct: [220, 120],
    anchor: [0.5, 1.1],
    stops: [
      { pos: 0, h: 258, s: 18, l: 83, a: 0.3 },
      { pos: 0.28, h: 30, s: 20, l: 86, a: 0.14 },
      { pos: 0.48, h: 256, s: 12, l: 91, a: 0.06 },
      { pos: 0.7, h: 256, s: 12, l: 91, a: 0 },
    ],
  },
];

/** background-size % pairs per layer — breathe “from” */
const SIZE_FROM: Vec2[] = [
  [130, 120],
  [115, 105],
  [110, 100],
  [120, 100],
  [220, 130],
];

const SIZE_TO: Vec2[] = [
  [148, 134],
  [128, 118],
  [122, 112],
  [136, 115],
  [240, 142],
];

/** Rest / drift “from” positions (% for background-position) */
const POS_REST: Vec2[] = [
  [100, 100],
  [0, 92],
  [94, 0],
  [50, 0],
  [50, 106],
];

const POS_DRIFT_TO: Vec2[] = [
  [92, 94],
  [8, 100],
  [100, 8],
  [46, 6],
  [50, 98],
];

/** Enter animation: start positions */
const POS_ENTER_START: Vec2[] = [
  [100, 160],
  [0, 152],
  [94, 60],
  [50, 60],
  [50, 166],
];

const POS_REDUCED: Vec2[] = [
  [96, 97],
  [4, 96],
  [97, 4],
  [48, 3],
  [50, 102],
];

const SIZE_REDUCED: Vec2[] = [
  [138, 126],
  [120, 110],
  [116, 104],
  [128, 106],
  [230, 136],
];

function hsla(h: number, s: number, l: number, a: number): string {
  return `hsla(${h} ${s}% ${l}% / ${a})`;
}

function easeEnter(t: number): number {
  // cubic-bezier(0.22, 1, 0.36, 1) — close enough for backdrop
  return 1 - (1 - t) ** 3;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** CSS `animation: … alternate` — ping-pong 0→1 over period with ease-in-out */
function alternatePhase(elapsed: number, periodMs: number): number {
  const u = ((elapsed / periodMs) % 2 + 2) % 2;
  const seg = u < 1 ? u : 2 - u;
  return easeInOut(seg);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerp2(a: Vec2, b: Vec2, t: number): Vec2 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  layer: RadialDef,
  sizePct: Vec2,
  posPct: Vec2,
  opacityScale: number
): void {
  const imgW = (sizePct[0] / 100) * w;
  const imgH = (sizePct[1] / 100) * h;
  const ox = (posPct[0] / 100) * (w - imgW);
  const oy = (posPct[1] / 100) * (h - imgH);

  const cx = ox + layer.anchor[0] * imgW;
  const cy = oy + layer.anchor[1] * imgH;
  const rx = (layer.ellipsePct[0] / 100) * imgW;
  const ry = (layer.ellipsePct[1] / 100) * imgH;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const st of layer.stops) {
    g.addColorStop(st.pos, hsla(st.h, st.s, st.l, st.a * opacityScale));
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paint(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  elapsed: number,
  enterT: number,
  reducedMotion: boolean
): void {
  const w = cssW;
  const h = cssH;
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  let opacity = 1;
  let positions: Vec2[];
  let sizes: Vec2[];

  if (reducedMotion) {
    opacity = 1;
    positions = POS_REDUCED.map((p) => [...p] as Vec2);
    sizes = SIZE_REDUCED.map((s) => [...s] as Vec2);
  } else {
    const breatheT = alternatePhase(elapsed, 28000);
    const driftT = alternatePhase(elapsed, 38000);
    sizes = SIZE_FROM.map((from, i) => lerp2(from, SIZE_TO[i], breatheT));

    if (enterT < 1) {
      const e = easeEnter(enterT);
      positions = POS_ENTER_START.map((start, i) => lerp2(start, POS_REST[i], e));
      opacity = enterT <= 0.4 ? easeEnter(enterT / 0.4) : 1;
    } else {
      positions = POS_REST.map((rest, i) => lerp2(rest, POS_DRIFT_TO[i], driftT));
    }
  }

  for (let i = LAYERS.length - 1; i >= 0; i--) {
    drawLayer(ctx, w, h, LAYERS[i], sizes[i], positions[i], opacity);
  }
}

let rafId = 0;
let resizeObs: ResizeObserver | null = null;
let onOrient: (() => void) | null = null;

export function initPageMeshCanvas(): void {
  destroyPageMeshCanvas();

  const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  const enterDuration = 1600;

  const resize = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cssW = vw * INSET;
    const cssH = vh * INSET;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const scale = dpr * SUPERSAMPLE;
    canvas.width = Math.max(1, Math.floor(cssW * scale));
    canvas.height = Math.max(1, Math.floor(cssH * scale));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  };

  const frame = (now: number) => {
    const elapsed = now - t0;
    const enterT = reducedMotion ? 1 : Math.min(1, elapsed / enterDuration);
    const cssW = window.innerWidth * INSET;
    const cssH = window.innerHeight * INSET;
    paint(ctx, cssW, cssH, elapsed, enterT, reducedMotion);
    rafId = requestAnimationFrame(frame);
  };

  cancelAnimationFrame(rafId);
  resize();
  rafId = requestAnimationFrame(frame);

  resizeObs = new ResizeObserver(() => resize());
  resizeObs.observe(document.documentElement);
  onOrient = () => resize();
  window.addEventListener('orientationchange', onOrient, { passive: true });
}

export function destroyPageMeshCanvas(): void {
  cancelAnimationFrame(rafId);
  resizeObs?.disconnect();
  resizeObs = null;
  if (onOrient) {
    window.removeEventListener('orientationchange', onOrient);
    onOrient = null;
  }
}
