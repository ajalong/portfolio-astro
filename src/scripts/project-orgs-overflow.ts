/**
 * Hide the orgs row in .project-team-card-group when any card's text
 * content wraps onto multiple lines.
 *
 * The orgs row lays out N orgs as equal-width flex cells. When the row
 * gets narrow enough that any cell can't fit its caption / name on a
 * single line, the visual rhythm of the strip falls apart — uneven row
 * heights, awkward wraps. Rather than letting it degrade, hide the whole
 * row (all-or-nothing: one card wraps, all hide).
 *
 * Detection is content + container driven rather than viewport-based, so
 * it lives in JS instead of a media query — the trigger threshold depends
 * on the specific text content of the orgs on a given project page.
 *
 * Mechanics:
 *   - Measure each text element's height against its computed line-height.
 *   - If any element's rendered height exceeds one line, the row gets
 *     `data-overflowing`; CSS hides it (`display: none`).
 *   - Re-run on viewport resize (rAF-debounced).
 *   - Re-run after fonts load — measurements before the web font is ready
 *     would use fallback metrics and produce wrong decisions.
 *
 * Trade-off: when this fires for the first time on initial load, the orgs
 * row may briefly render visible before being hidden — a one-frame flicker.
 * Acceptable for this rare case (only happens when the page loads at a
 * width that's too narrow for the orgs to fit).
 */
export function initProjectOrgsOverflow(): () => void {
  const row = document.querySelector<HTMLElement>('.project-team-card-group__orgs');
  if (!row) return () => {};

  const textElements = Array.from(
    row.querySelectorAll<HTMLElement>('.attribution__name, .attribution__role'),
  );
  if (textElements.length === 0) return () => {};

  const check = (): void => {
    // Reveal (if currently hidden) so we can measure. The browser batches
    // the attribute removal + re-application within this synchronous tick;
    // in practice it doesn't paint the intermediate state.
    row.removeAttribute('data-overflowing');

    let overflowing = false;
    for (const el of textElements) {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      if (Number.isNaN(lineHeight)) continue;
      // 2px tolerance for sub-pixel rounding.
      if (el.offsetHeight > lineHeight + 2) {
        overflowing = true;
        break;
      }
    }

    if (overflowing) {
      row.setAttribute('data-overflowing', '');
    }
  };

  // Initial check — after fonts load so we measure against the real glyphs.
  if (document.fonts?.ready) {
    document.fonts.ready.then(check);
  } else {
    check();
  }
  // Also check immediately (covers the case where fonts.ready resolves late
  // on cached page loads).
  check();

  // rAF-debounced resize re-check.
  let frame = 0;
  const onResize = (): void => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(check);
  };
  const observer = new ResizeObserver(onResize);
  observer.observe(document.documentElement);

  return () => {
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
  };
}
