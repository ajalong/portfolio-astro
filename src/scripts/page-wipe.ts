// Page-fade transition for home → case-study navigation.
//
// `.page-wipe` is a fixed-position white-wash overlay that mirrors the
// background's static white-gradient pattern but at higher edge alpha.
// Animating its opacity 0 → 1 → 0 intensifies the page's existing wash
// rather than introducing a separate visual effect. Foreground page
// content (`.page_container`) cross-fades in parallel.
//
// We hijack the click instead of using astro:before-swap because the
// framework doesn't await replaced event.swap promises, so deferring
// the swap that way doesn't actually pause until the cover anim completes.
//
// Other navigations (project → project, project → home, direct URL) are
// untouched.
import { navigate } from 'astro:transitions/client';

const COVER_DURATION = 600;
const REVEAL_DURATION = 600;
// Cover accelerates into peak; reveal decelerates out.
const COVER_EASING = 'cubic-bezier(0.4, 0, 1, 1)';   // ease-in
const REVEAL_EASING = 'cubic-bezier(0, 0, 0.4, 1)';  // ease-out

function shouldWipe(toPath: string): boolean {
  return location.pathname === '/' && toPath.startsWith('/project/');
}

function wipeEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.page-wipe');
}

let wiping = false;

async function runWipe(href: string): Promise<void> {
  const wipe = wipeEl();
  if (!wipe) {
    await navigate(href);
    return;
  }

  wiping = true;
  const oldContainer = document.querySelector<HTMLElement>('.page_container');

  // Kick the navigation off in parallel with the cover animation. ClientRouter
  // fetches + swaps as soon as it's ready; transition:persist on .page-wipe
  // keeps the overlay in place across the swap.
  const navPromise = navigate(href);

  // Cover: white wash ramps up while content fades out.
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
  // before its fade-in starts.
  const newContainer = document.querySelector<HTMLElement>('.page_container');

  // Reveal: white wash ramps down while new content fades in.
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
