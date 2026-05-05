// Page-wipe overlay for home → case-study navigation.
//
// Reads the destination project's brand colours from the clicked card's
// [data-bg-section] ancestor, runs a soft-edged gradient overlay across
// the viewport, drives the navigation manually via navigate() from
// astro:transitions/client, then exits.
//
// The overlay (.page-wipe) is 200 vh tall with transparent top/bottom
// 20 % and an opaque 60 % middle (see _page-wipe.scss). The opaque band
// is 120 vh — comfortably larger than the viewport — so peak coverage
// fully hides the swap.
//
// Element-position keyframes (translateY values, in vh):
//   start (off-screen below):  +100
//   peak coverage / swap:       -50  (opaque band centred on viewport)
//   end (off-screen above):    -200
// Total travel: 300 vh, split evenly across the cover + reveal phases.
//
// We hijack the click instead of using astro:before-swap because the
// framework doesn't await replaced event.swap promises, so deferring the
// swap that way doesn't actually pause until the cover anim completes.
//
// Other navigations (project → project, project → home, direct URL) are
// untouched.
import { navigate } from 'astro:transitions/client';

// Bloom sweep: build → peak → ramp down. Pure opacity animation; the
// gradient is anchored at the bottom of the viewport (see _page-wipe.scss).
// Foreground page content (`.page_container`) fades out during cover and
// fades in during reveal, in parallel — so the wipe's bloom acts as the
// background transition while the page content cross-fades on top of it.
const COVER_DURATION = 600;
const REVEAL_DURATION = 600;
// Cover accelerates into peak (matches the "surge"); reveal decelerates
// out (matches "ramp back down").
const COVER_EASING = 'cubic-bezier(0.4, 0, 1, 1)';   // ease-in
const REVEAL_EASING = 'cubic-bezier(0, 0, 0.4, 1)';  // ease-out

function shouldWipe(toPath: string): boolean {
  return location.pathname === '/' && toPath.startsWith('/project/');
}

function wipeEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.page-wipe');
}

let wiping = false;

async function runWipe(href: string, primary: string, secondary: string): Promise<void> {
  const wipe = wipeEl();
  if (!wipe) {
    await navigate(href);
    return;
  }

  wiping = true;
  wipe.style.setProperty('--wipe-primary', primary);
  wipe.style.setProperty('--wipe-secondary', secondary);

  const oldContainer = document.querySelector<HTMLElement>('.page_container');

  // Kick the navigation off in parallel with the cover animation. ClientRouter
  // fetches + swaps as soon as it's ready; the persist attribute on .page-wipe
  // keeps our overlay in place across the swap. Doing this in parallel with
  // (rather than after) the cover anim removes the awkward stationary peak
  // that otherwise sits while the network resolves.
  const navPromise = navigate(href);

  // Cover: wipe blooms in (opacity 0 → 1) while the outgoing page content
  // fades out (1 → 0). Parallel via Promise.all so we wait for both before
  // proceeding to the swap-and-reveal phase.
  await Promise.all([
    wipe.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: COVER_DURATION, easing: COVER_EASING, fill: 'forwards' },
    ).finished,
    oldContainer
      ? oldContainer.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: COVER_DURATION, easing: COVER_EASING, fill: 'forwards' },
        ).finished
      : Promise.resolve(),
  ]);

  // If the network was slower than the cover anim, wait — otherwise this is
  // a no-op and reveal starts immediately.
  await navPromise;

  // The before-swap hook (registered in initPageWipe) has already set the
  // new container's inline opacity to 0 so it doesn't flash full-opacity
  // through the wipe's transparent edges before its fade-in starts.
  const newContainer = document.querySelector<HTMLElement>('.page_container');

  // Reveal: wipe ramps down (1 → 0) while the new page content fades in
  // (0 → 1). Reads as the new content rising on top of the background
  // transition's bloom.
  await Promise.all([
    wipe.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: REVEAL_DURATION, easing: REVEAL_EASING, fill: 'forwards' },
    ).finished,
    newContainer
      ? newContainer.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: REVEAL_DURATION, easing: REVEAL_EASING, fill: 'forwards' },
        ).finished
      : Promise.resolve(),
  ]);

  // Reset for next time.
  wipe.style.opacity = '0';
  if (newContainer) newContainer.style.opacity = '';
  wiping = false;
}

export function initPageWipe(): void {
  // Pre-hide the incoming page's content so it doesn't paint at full
  // opacity through the wipe's transparent edges between swap and the
  // start of the reveal-phase fade-in. Astro fires astro:before-swap with
  // event.newDocument before the DOM swap, giving us a chance to set the
  // inline style on the soon-to-be container.
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
      // Same-origin internal nav only.
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;

      if (!shouldWipe(url.pathname)) return;

      const section = link.closest('[data-bg-section]') as HTMLElement | null;
      const primary = section?.dataset.brandPrimary;
      const secondary = section?.dataset.brandSecondary;
      if (!primary || !secondary) return;

      // We're handling this click ourselves.
      event.preventDefault();
      event.stopPropagation();
      void runWipe(url.pathname + url.search + url.hash, primary, secondary);
    },
    { capture: true },
  );
}
