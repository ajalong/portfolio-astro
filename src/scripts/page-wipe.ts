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

const COVER_DURATION = 500;
const REVEAL_DURATION = 500;
const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

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

  // Cover: rise from off-screen below to peak coverage (opaque band
  // centred on viewport).
  await wipe.animate(
    [{ transform: 'translateY(100vh)' }, { transform: 'translateY(-50vh)' }],
    { duration: COVER_DURATION, easing: EASING, fill: 'forwards' },
  ).finished;

  // Drive navigation. ClientRouter handles fetch + DOM swap; the persist
  // attribute on .page-wipe keeps our overlay in place across the swap.
  await navigate(href);

  // Reveal: continue past peak and exit off the top.
  await wipe.animate(
    [{ transform: 'translateY(-50vh)' }, { transform: 'translateY(-200vh)' }],
    { duration: REVEAL_DURATION, easing: EASING, fill: 'forwards' },
  ).finished;

  // Reset to off-screen below for the next time.
  wipe.style.transform = 'translateY(100vh)';
  wiping = false;
}

export function initPageWipe(): void {
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
