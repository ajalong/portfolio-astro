/**
 * Match SVG <rect> rx/ry to the parent's CSS border-radius so the stroke follows a true
 * rounded rectangle (uniform corner radius in px), not an ellipse from equal viewBox rx=ry.
 *
 * viewBox 0 0 100 100 with preserveAspectRatio="none":
 *   rx = (r / w) * 100,  ry = (r / h) * 100
 */
function usedBorderRadiusPx(el: HTMLElement, w: number, h: number): number {
  const raw = getComputedStyle(el).borderTopLeftRadius || '0';
  const m = raw.match(/^([\d.]+)px/);
  if (!m) return Math.min(w, h) / 2;
  const specified = parseFloat(m[1]);
  return Math.min(specified, w / 2, h / 2);
}

function updateRing(svg: SVGSVGElement): void {
  const parent = svg.parentElement;
  if (!parent) return;

  const w = parent.clientWidth;
  const h = parent.clientHeight;
  if (w < 1 || h < 1) return;

  const rect = svg.querySelector('rect');
  if (!rect) return;

  const r = usedBorderRadiusPx(parent as HTMLElement, w, h);
  const rx = (r / w) * 100;
  const ry = (r / h) * 100;

  rect.setAttribute('rx', String(rx));
  rect.setAttribute('ry', String(ry));
}

let activeObserver: ResizeObserver | null = null;

const RIM_CYCLE = 10;
const RIM_FAST_OFFSETS = [0.2, 1.9, 3.7, 5.5, 7.7];
const RIM_SELECTOR =
  'a.cta__link, button.u-pill-primary, .project-nav-btn';
const rimListenerKey = Symbol('rimSeek');

function seekRimToFastZone(e: Event): void {
  const el = e.currentTarget as HTMLElement;
  const offset = RIM_FAST_OFFSETS[Math.floor(Math.random() * RIM_FAST_OFFSETS.length)];
  el.style.setProperty('--rim-seek', String(offset));
  el.dataset.rimRestart = '';
  requestAnimationFrame(() => {
    delete el.dataset.rimRestart;
  });
}

export function initButtonBorderRings(): void {
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }

  const run = () => {
    document.querySelectorAll<SVGSVGElement>('.btn-border-ring').forEach((svg) => {
      updateRing(svg);
    });
  };

  run();
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });

  activeObserver = new ResizeObserver(run);

  document.querySelectorAll<SVGSVGElement>('.btn-border-ring').forEach((svg) => {
    const parent = svg.parentElement;
    if (parent) activeObserver!.observe(parent);
  });

  document.querySelectorAll<HTMLElement>(RIM_SELECTOR).forEach((el) => {
    if ((el as any)[rimListenerKey]) return;
    (el as any)[rimListenerKey] = true;
    el.addEventListener('pointerenter', seekRimToFastZone);
  });
}
