// Page-wipe transition for any internal page change.
//
// Background and foreground are fully decoupled:
//
// - Background: a single 0.8 s burst on `.bg__base`. An additive 200vw
//   shift on `background-position-x` is composed on top of the always-
//   running 20 s bg-slide, so the brand-colour gradient ramps up,
//   peaks, and ramps down — one full wavelength of accelerated drift
//   over the burst — before settling back to the steady drift. The
//   element itself never moves (it's viewport-sized with a tiled
//   gradient), so an accelerated drift can't expose the html bg
//   underneath. The white wash layers (`.bg__fg-radial`,
//   `.bg__fg-linear`) are static throughout.
//
// - Foreground (`.page_container`) cross-fades out, then back in once
//   the new page is ready. Driven by network/paint timing, not the bg
//   clock — the background may finish before the foreground is ready
//   (and that's fine, the burst is purely additive on top of steady drift).
//
// `.bg__base` carries `transition:persist` so the same DOM node survives
// the swap and its WAAPI burst continues uninterrupted.
//
// We hijack the click instead of using astro:before-swap because the
// framework doesn't await replaced event.swap promises, so deferring
// the swap that way doesn't actually pause until the cover anim
// completes. Direct URL entries (no click) bypass the transition.
import { navigate } from 'astro:transitions/client';

// Background burst — one wavelength of accelerated drift over 0.8 s.
const BG_BURST_DURATION = 800;
// Light ease-in-out: velocity ramps up, peaks mid-burst, ramps down.
const BG_BURST_EASE = 'cubic-bezier(0.4, 0, 0.6, 1)';

// Foreground cross-fade — driven by content readiness, not the bg clock.
const FG_FADE_DURATION = 600;
const FG_EASE = 'cubic-bezier(0, 0, 0, 1)';   // ease-out (per spec "0,1")

function shouldWipe(toPath: string): boolean {
  // Trigger on any same-origin page change. Same-path navigations
  // (refreshes, hash-only changes) skip the transition.
  return toPath !== location.pathname;
}

function baseEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.bg__base');
}

// Resolve after the next frame has painted — two requestAnimationFrame
// calls guarantee the browser has had a chance to lay out and paint the
// new page once. Cheap (~16-32 ms) and avoids any race with Astro's
// astro:page-load event timing.
function waitForPageReady(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

let wiping = false;
// In-flight bg burst, tracked so a rapid second navigation can replace
// it cleanly instead of stacking animations on the persisted base layer.
let bgBurst: Animation | null = null;

function startBgBurst(): void {
  bgBurst?.cancel();
  const base = baseEl();
  if (!base) return;
  // Additive background-position burst — composes on top of the always-
  // running CSS bg-slide so the brand-colour pattern bursts forward by
  // exactly one wavelength (200vw) over BG_BURST_DURATION. The CSS
  // animation runs bg-position-x 200vw → 0; an additive −200vw burst
  // accelerates motion in the same direction. composite:'add' is per
  // keyframe.
  const a = base.animate(
    [
      { backgroundPositionX: '0',      composite: 'add' } as any,
      { backgroundPositionX: '-200vw', composite: 'add' } as any,
    ],
    { duration: BG_BURST_DURATION, easing: BG_BURST_EASE, fill: 'none' },
  );
  bgBurst = a;
  a.finished.then(
    () => { if (bgBurst === a) bgBurst = null; },
    () => { /* swallow AbortError when cancelled by a successor */ },
  );
}

async function runWipe(href: string): Promise<void> {
  wiping = true;
  const oldContainer = document.querySelector<HTMLElement>('.page_container');

  // Fire the background burst independently — it runs to completion
  // regardless of how long the foreground takes to load.
  startBgBurst();

  // Kick the navigation off in parallel with the foreground cover.
  const navPromise = navigate(href);

  // Foreground cover — fade old content out.
  const coverContainer = oldContainer?.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    { duration: FG_FADE_DURATION, easing: FG_EASE, fill: 'forwards' },
  );
  await (coverContainer?.finished ?? Promise.resolve());

  await navPromise;

  // Wait for the new page's initial paint before starting the reveal so
  // content doesn't fade in onto a blank/half-rendered DOM.
  await waitForPageReady();

  const newContainer = document.querySelector<HTMLElement>('.page_container');

  // Foreground reveal — fade new content in.
  const revealContainer = newContainer?.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: FG_FADE_DURATION, easing: FG_EASE, fill: 'forwards' },
  );
  await (revealContainer?.finished ?? Promise.resolve());

  // Cancel foreground animations and clear inline styles so the new
  // container returns to its natural compositing state. fill:'forwards'
  // alone keeps the animation in the active list, which can hold the
  // element on its own GPU layer — observed to break backdrop-filter on
  // overlays (e.g. the project team panel) painted later. The bg burst
  // is left running; its own finished handler cleans up.
  coverContainer?.cancel();
  revealContainer?.cancel();
  if (newContainer) newContainer.style.opacity = '';
  wiping = false;
}

export function initPageWipe(): void {
  // Pre-hide the incoming page's content so it doesn't flash full-opacity
  // before its reveal-phase fade-in starts. Astro fires astro:before-swap
  // with event.newDocument before the DOM swap.
  document.addEventListener('astro:before-swap', (event: any) => {
    if (!wiping) return;
    const incoming = event.newDocument?.querySelector?.('.page_container') as HTMLElement | null;
    if (incoming) incoming.style.opacity = '0';
  });

  // Capture phase so we run before ClientRouter's bubble-phase handler.
  document.addEventListener(
    'click',
    (event) => {
      if (wiping) return;
      // Honour modifier keys / non-primary clicks — let the browser do its thing.
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const link = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      // Skip links explicitly targeted elsewhere (`target="_blank"`,
      // `target="_top"`, named frame, etc). Without this, the wipe
      // intercepts the click for any same-origin URL — including PDFs
      // and other downloads the user wanted to open in a new tab.
      if (link.target && link.target !== '_self') return;
      // Same-origin internal nav only.
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;

      if (!shouldWipe(url.pathname)) return;

      // We're handling this click ourselves.
      event.preventDefault();
      event.stopPropagation();
      void runWipe(url.pathname + url.search + url.hash);
    },
    { capture: true },
  );
}
