/**
 * Progressively drop org cards from the end of the orgs row when the
 * remaining cards' text can't fit on a single line.
 *
 * Behaviour:
 *   - All cards visible by default.
 *   - When any visible card's text wraps onto multiple lines, hide the
 *     last currently-visible card and re-measure.
 *   - Stop hiding once 2 cards remain visible. At the 2-card minimum,
 *     content is allowed to flow onto multiple lines (no further hiding).
 *
 * This replaces an earlier all-or-nothing approach that hid the entire
 * orgs row when any card overflowed. Progressive drop preserves more
 * information at narrow widths — the full team list still surfaces every
 * member's org affiliation via the role-card overlay, but the visible
 * strip keeps at least the 2 highest-priority orgs as long as the layout
 * can accommodate them.
 *
 * Detection is content + container driven rather than viewport-based, so
 * it lives in JS instead of a media query — the trigger threshold depends
 * on the specific text content of the orgs on a given project page.
 *
 * Mechanics:
 *   - Reset (reveal everything) at the start of each check.
 *   - For each candidate visible count from N down to 2:
 *       - Measure each visible card's text against its computed line-height.
 *       - If any text wraps, hide the last visible card and continue.
 *       - Otherwise, the row fits — stop.
 *   - Re-run on viewport resize (rAF-debounced).
 *   - Re-run after fonts load — measurements before the web font is ready
 *     would use fallback metrics and produce wrong decisions.
 *
 * Trade-off: when this fires for the first time on initial load, the row
 * may briefly render at full width before the last card hides — a
 * one-frame flicker. Acceptable for this rare case.
 */
export function initProjectOrgsOverflow(): () => void {
  const row = document.querySelector<HTMLElement>('.project-team-card-group__orgs');
  if (!row) return () => {};

  const cards = Array.from(row.querySelectorAll<HTMLElement>('.org-card'));
  if (cards.length === 0) return () => {};

  // Minimum number of cards that must stay visible. At this count the
  // row stops dropping cards even if content still wraps — at that point
  // the wrapping is acceptable and dropping further would leave the row
  // too sparse to communicate the project's org context.
  const MIN_VISIBLE = 2;

  // Force a synchronous layout-read on every visible card and return
  // true if any of their name/role lines have rendered taller than a
  // single line (which would mean the text has wrapped).
  const overflows = (visibleCount: number): boolean => {
    for (let i = 0; i < visibleCount; i++) {
      const texts = cards[i].querySelectorAll<HTMLElement>(
        '.attribution__name, .attribution__role',
      );
      for (const el of texts) {
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
        if (Number.isNaN(lineHeight)) continue;
        // 2px tolerance for sub-pixel rounding.
        if (el.offsetHeight > lineHeight + 2) {
          return true;
        }
      }
    }
    return false;
  };

  const check = (): void => {
    // Reveal everything. Sets the baseline for the measurement loop and
    // also self-heals if the viewport grew enough to bring cards back.
    for (const card of cards) {
      card.removeAttribute('data-overflow-hidden');
    }

    // Hide the last visible card while overflow persists AND we still
    // have headroom above MIN_VISIBLE. Each attribute set forces the
    // remaining cards to re-flow into the freed space; the next
    // `offsetHeight` read on the next loop iteration captures that new
    // layout, so the measurements stay correct without an explicit
    // flush.
    let visible = cards.length;
    while (visible > MIN_VISIBLE && overflows(visible)) {
      cards[visible - 1].setAttribute('data-overflow-hidden', '');
      visible--;
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
