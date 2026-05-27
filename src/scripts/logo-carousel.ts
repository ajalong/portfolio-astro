/**
 * Logo-carousel runtime.
 *
 * The marquee itself is pure CSS (see `_logo-carousel.scss`); this
 * script handles three things the CSS can't:
 *
 *   1. Measurement & clone management — the keyframe translates by
 *      one set-width and the duration is `setWidth / pps`, so the
 *      script measures the rendered set and adds clones to fill ≥2×
 *      the container width.
 *   2. Off-screen pause via IntersectionObserver — a linear-infinite
 *      transform keeps the GPU compositor working every frame even
 *      when the carousel is well below the fold. Pausing on
 *      `data-offscreen` cuts that idle battery cost.
 *   3. Hidden-tab pause via `visibilitychange` — backgrounded tabs
 *      shouldn't churn the GPU either.
 *
 * There is no interaction here (no hover-pause, no drag). The carousel
 * is purely decorative — auto-scrolls forever at a constant px/sec.
 */
export function initLogoCarousels(): void {
  document.querySelectorAll<HTMLElement>('[data-logo-carousel]').forEach(initOne);
}

function initOne(carousel: HTMLElement): void {
  // Idempotency — initLogoCarousels fires on every astro:page-load;
  // skip wrappers already initialised on a previous load.
  if (carousel.dataset.logoCarouselReady === '1') return;
  carousel.dataset.logoCarouselReady = '1';

  const track = carousel.querySelector<HTMLElement>('[data-logo-carousel-track]');
  if (!track) return;

  // Capture the original (SSR-rendered) set of items. We'll clone these
  // until the track exceeds 2× the container width, so the marquee's
  // single-set-width translation always has a fresh set ready to scroll
  // in. Wait a frame so layout has settled before measuring.
  const originalItems = Array.from(track.children) as HTMLElement[];
  if (originalItems.length === 0) return;

  const layoutSet = (): void => {
    // Measure one set's intrinsic width — the children are flex items
    // already laid out, so summing their offsetWidth + the gap between
    // them gives an accurate width without needing to read computed
    // styles.
    const gapPx = parseFloat(getComputedStyle(track).columnGap) || 0;
    // Sum of one set's intrinsic widths + the gaps BETWEEN those items.
    const setIntrinsicWidth = originalItems.reduce((sum, el, i) => {
      return sum + el.offsetWidth + (i > 0 ? gapPx : 0);
    }, 0);
    if (setIntrinsicWidth === 0) return; // measurement not ready yet (e.g. images still loading)
    // The loop distance is one set + the trailing gap between the
    // last item of set N and the first item of set N+1. Without this
    // trailing gap, translating by setIntrinsicWidth lands set N+1's
    // first item one gap-width to the right of where set N's first
    // item was — visible as a sideways "snap" each time the animation
    // wraps. Adding the gap makes the wrap visually identical to the
    // start position.
    const loopDistance = setIntrinsicWidth + gapPx;

    // Trim previously-added clones so this re-run starts clean.
    while (track.children.length > originalItems.length) {
      track.lastElementChild?.remove();
    }

    // How many copies do we need? The animation translates by exactly
    // one loop-distance, so the track must contain at least one full
    // set PAST the visible area at all points in the loop — i.e.
    // track width ≥ container width + one loop-distance. Add a copy
    // in reserve so the seamless wrap point lands comfortably
    // off-screen.
    const containerWidth = carousel.clientWidth;
    const copiesNeeded = Math.max(1, Math.ceil(containerWidth / loopDistance)) + 1;
    for (let i = 0; i < copiesNeeded; i++) {
      for (const el of originalItems) {
        const clone = el.cloneNode(true) as HTMLElement;
        // Mark clones as decorative — screen readers should announce
        // each logo once, not N times.
        clone.setAttribute('aria-hidden', 'true');
        const img = clone.querySelector('img');
        if (img) img.setAttribute('alt', '');
        track.appendChild(clone);
      }
    }

    track.style.setProperty('--set-width', `${loopDistance}px`);

    // Compute animation duration from a constant pixels-per-second
    // value (--logo-carousel-pps). With duration = distance / speed,
    // adding more logos extends the loop time rather than speeding the
    // motion up — the perceived scroll pace stays the same regardless
    // of how many logos are in the roster.
    const pps = parseFloat(
      getComputedStyle(carousel).getPropertyValue('--logo-carousel-pps'),
    ) || 25;
    const durationSeconds = loopDistance / pps;
    track.style.setProperty('--animation-duration', `${durationSeconds}s`);

    carousel.setAttribute('data-ready', '');
  };

  // First-pass layout. Browser timing can leave items at offsetWidth 0
  // even when their <img> reports `complete: true` (especially for
  // SVGs where decode is decoupled from `complete`, and more so when
  // there are many SVGs to decode in the same tick). Two-stage retry:
  //
  //   1. Fast rAF chain (~1.6s budget) for the common case where
  //      everything is ready within a few frames.
  //   2. Slow setInterval fallback (~5s budget) for stubborn cases —
  //      lazy-loaded images, heavy decoding, etc. The interval cleans
  //      itself up the moment data-ready is set.
  //
  // Each layoutSet call is idempotent — it bails immediately if
  // setIntrinsicWidth measures 0, and re-runs trim+clone if invoked
  // after data-ready (no-op since data-ready stays set).
  const retryRaf = (attemptsLeft: number): void => {
    layoutSet();
    if (carousel.hasAttribute('data-ready')) return;
    if (attemptsLeft <= 0) return;
    requestAnimationFrame(() => retryRaf(attemptsLeft - 1));
  };
  requestAnimationFrame(() => retryRaf(100));

  let slowAttempts = 10;
  const slowFallback = window.setInterval(() => {
    if (carousel.hasAttribute('data-ready') || slowAttempts-- <= 0) {
      clearInterval(slowFallback);
      return;
    }
    layoutSet();
  }, 500);

  // Belt-and-braces: re-measure when each image's `load` fires. Skips
  // already-complete images (no re-fire) but catches the late-load
  // case on cold network. `decode()` is awaited where supported as
  // an extra signal — it resolves once the image is actually ready
  // to paint, which is later than `complete: true`.
  for (const img of originalItems.flatMap((el) =>
    Array.from(el.querySelectorAll<HTMLImageElement>('img')),
  )) {
    img.addEventListener('load', () => requestAnimationFrame(layoutSet), { once: true });
    img.addEventListener('error', () => requestAnimationFrame(layoutSet), { once: true });
    if (img.decode) {
      img.decode().then(() => requestAnimationFrame(layoutSet)).catch(() => {});
    }
  }

  // Re-measure on viewport resize — the container width changes and
  // we may need more or fewer clones. ResizeObserver fires on every
  // size change; debounce to one rAF tick.
  let resizeScheduled = false;
  const observer = new ResizeObserver(() => {
    if (resizeScheduled) return;
    resizeScheduled = true;
    requestAnimationFrame(() => {
      resizeScheduled = false;
      layoutSet();
    });
  });
  observer.observe(carousel);

  // Performance: pause the animation while the carousel is off-screen
  // or the tab is hidden. A linear-infinite transform animation keeps
  // the compositor working every frame even when nothing's visible —
  // measurable battery/fan impact on long pages. CSS picks up the
  // pause via the `data-offscreen` / `data-hidden-tab` attributes
  // (see `_logo-carousel.scss`).
  //
  // rootMargin of 0 is fine: the wrapper has `overflow: hidden`, so
  // anything past its edge isn't visible anyway. Threshold 0 means we
  // toggle the moment a single pixel enters or leaves the viewport.
  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          carousel.removeAttribute('data-offscreen');
        } else {
          carousel.setAttribute('data-offscreen', '');
        }
      }
    },
    { threshold: 0 },
  );
  intersectionObserver.observe(carousel);

  const onVisibilityChange = (): void => {
    if (document.hidden) {
      carousel.setAttribute('data-hidden-tab', '');
    } else {
      carousel.removeAttribute('data-hidden-tab');
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  // Initial sync in case the page loaded with the tab already hidden
  // (e.g. opened in a background tab).
  onVisibilityChange();
}
