// Page-fade transition for home → case-study navigation.
//
// During the transition the page background's white wash (`.bg__fg`)
// ramps DOWN, exposing the brand-coloured base; the foreground content
// (`.page_container`) cross-fades in parallel. After the swap the wash
// ramps back UP and the new content fades in. The brand colour briefly
// takes centre stage between the two pages.
//
// `.bg__fg` carries `transition:persist` so the same DOM node moves
// across the swap and the WAAPI animation continues uninterrupted.
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

function fgEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.bg__fg');
}

let wiping = false;

async function runWipe(href: string): Promise<void> {
  const fg = fgEl();
  if (!fg) {
    await navigate(href);
    return;
  }

  wiping = true;
  const oldContainer = document.querySelector<HTMLElement>('.page_container');

  // Kick the navigation off in parallel with the cover animation. ClientRouter
  // fetches + swaps as soon as it's ready; transition:persist on .bg__fg
  // keeps its WAAPI animation running through the swap.
  const navPromise = navigate(href);

  // Cover: lift the white wash by tightening the gradient's half-opacity
  // stop from 100% to 40% — the drop-off steepens so more brand colour
  // shows through near the bottom while the top stays fully washed.
  // Simultaneously shrink the radial spotlight (--fg-radial-scale 1 → 0)
  // so the bright top-centre dome contracts to a point. Foreground
  // content fades out in parallel.
  const coverFg = fg.animate(
    // Cast: TS DOM lib doesn't model custom-property keyframes, but
    // WAAPI accepts them when the property is @property-registered.
    [
      { ['--fg-fade-stop']: '100%', ['--fg-radial-scale']: '1' } as any,
      { ['--fg-fade-stop']: '40%', ['--fg-radial-scale']: '0' } as any,
    ],
    { duration: COVER_DURATION, easing: COVER_EASING, fill: 'forwards' },
  );
  const coverContainer = oldContainer?.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    { duration: COVER_DURATION, easing: COVER_EASING, fill: 'forwards' },
  );
  await Promise.all([
    coverFg.finished,
    coverContainer?.finished ?? Promise.resolve(),
  ]);

  // If the network was slower than the cover anim, wait — otherwise this is
  // a no-op and reveal starts immediately.
  await navPromise;

  // Re-query in case the DOM swap moved nodes around.
  const newFg = fgEl();
  const newContainer = document.querySelector<HTMLElement>('.page_container');

  // Reveal: lower the white wash back into place and grow the radial
  // spotlight back from 0 to 1; new content fades in.
  const revealFg = newFg?.animate(
    [
      { ['--fg-fade-stop']: '40%', ['--fg-radial-scale']: '0' } as any,
      { ['--fg-fade-stop']: '100%', ['--fg-radial-scale']: '1' } as any,
    ],
    { duration: REVEAL_DURATION, easing: REVEAL_EASING, fill: 'forwards' },
  );
  const revealContainer = newContainer?.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: REVEAL_DURATION, easing: REVEAL_EASING, fill: 'forwards' },
  );
  await Promise.all([
    revealFg?.finished ?? Promise.resolve(),
    revealContainer?.finished ?? Promise.resolve(),
  ]);

  // Cancel all WAAPI animations and clear inline styles so the elements
  // return to their natural compositing state. fill:'forwards' alone keeps
  // the animation in the active list, which can hold the element on its
  // own GPU layer — that has been observed to break backdrop-filter on
  // overlays (e.g. the project team panel) painted later.
  coverFg.cancel();
  coverContainer?.cancel();
  revealFg?.cancel();
  revealContainer?.cancel();
  if (newFg) {
    newFg.style.removeProperty('--fg-fade-stop');
    newFg.style.removeProperty('--fg-radial-scale');
  }
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
