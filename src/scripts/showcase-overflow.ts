/**
 * Three responsibilities for the showcase:
 *
 *  1. Layout selection — width-driven, no content-driven escalation:
 *
 *       desktop   ⇌   compact   ⇌   ultraNarrow
 *
 *     The showcase's rendered width (cardGroup clientWidth) picks the
 *     mode, full stop:
 *
 *       ≥ 720 px:  desktop
 *       450–719:   compact
 *       < 450 px:  ultraNarrow
 *
 *     Driven by cardGroup width (not viewport) because the homepage
 *     page-grid pulls main to cols 2–5 at ≥1080px viewports — so the
 *     showcase is much narrower than the viewport at large screens.
 *
 *     Width is the only input to mode selection. Long copy may visibly
 *     wrap or clip within a slot rather than bumping the whole showcase
 *     to a tighter layout — keeps mode predictable across projects.
 *
 *  2. Cross-card hover gradient continuity — measure every card's
 *     bounds against the card-group on every layout change, and
 *     write the resulting fractional position/size onto each card
 *     as CSS variables. The `::after` gradient rule reads those
 *     variables to size and position each card's slice of one
 *     virtual group-spanning gradient — so the hover reads as a
 *     single wash across the cards in *every* layout (desktop,
 *     compact, ultra-narrow), with no per-card blooms.
 *
 *  3. Per-card description fit — within whichever layout is active,
 *     metric-card descriptions hide individually when their card
 *     would overflow. The only content-aware behaviour in the script.
 *     CSS handles the visual hide via the class
 *     `.metric-card--hide-description`.
 */

type Layout = 'desktop' | 'compact' | 'ultraNarrow';

// Layout floor — the widest layout allowed at the showcase's current
// width. Driven by the showcase's actual rendered width (cardGroup
// clientWidth) rather than viewport, because the homepage's page-grid
// constrains main to cols 2–5 at ≥1080px viewports — so the showcase
// is much narrower than the viewport at large screen widths.
//
// Tier boundaries are fixed (independent of content length) so all
// showcases on the page share the same mode at the same width.
const FLOOR_COMPACT_MIN = 450;
const FLOOR_DESKTOP_MIN = 720;

function widthFloor(showcaseWidth: number): Layout {
  if (showcaseWidth >= FLOOR_DESKTOP_MIN) return 'desktop';
  if (showcaseWidth >= FLOOR_COMPACT_MIN) return 'compact';
  return 'ultraNarrow';
}

export function initShowcaseOverflowObservers(): void {
  document.querySelectorAll<HTMLElement>('.project-showcase').forEach(initOne);
}

function initOne(showcase: HTMLElement): void {
  const cardGroup = showcase.querySelector<HTMLElement>('.card-group');
  if (!cardGroup) return;

  const allCards = Array.from(cardGroup.children).filter(
    (c): c is HTMLElement => c instanceof HTMLElement,
  );

  // Metric cards that carry a description — candidates for the
  // per-card hide-description fit pass. Cards without a description
  // don't need toggling.
  const metricCardsWithDescription = allCards.filter(
    (c) =>
      c.classList.contains('metric-card') &&
      c.querySelector('.metric-card__description') !== null,
  );

  let layout: Layout = 'desktop';
  let scheduled = false;

  const setLayout = (next: Layout): void => {
    if (next === layout) return;
    layout = next;
    showcase.classList.toggle('project-showcase--compact', next === 'compact');
    showcase.classList.toggle(
      'project-showcase--ultra-narrow',
      next === 'ultraNarrow',
    );
  };

  // Per-card fit pass for metric descriptions. Reset every candidate to
  // its show-description baseline, force a layout, then hide on cards
  // whose content (value + label + description) overflows the slot.
  // The only content-aware behaviour in the script — layout mode itself
  // is width-driven only.
  const fitDescriptions = (): void => {
    if (metricCardsWithDescription.length === 0) return;
    for (const card of metricCardsWithDescription) {
      card.classList.remove('metric-card--hide-description');
    }
    // Force layout so scrollHeight reflects the reset state before the
    // next read below.
    void cardGroup.offsetHeight;
    for (const card of metricCardsWithDescription) {
      if (card.scrollHeight > card.clientHeight + 1) {
        card.classList.add('metric-card--hide-description');
      }
    }
  };

  // Update gradient position/size custom properties on every card so
  // the `::after` paints its correct slice of the group-spanning
  // gradient regardless of which layout we're in.
  const updateGradientVars = (): void => {
    const groupRect = cardGroup.getBoundingClientRect();
    if (groupRect.width === 0 || groupRect.height === 0) return;

    for (const card of allCards) {
      const cardRect = card.getBoundingClientRect();
      if (cardRect.width === 0 || cardRect.height === 0) continue; // hidden

      const xFrac = (cardRect.left - groupRect.left) / groupRect.width;
      const yFrac = (cardRect.top - groupRect.top) / groupRect.height;
      const wFrac = cardRect.width / groupRect.width;
      const hFrac = cardRect.height / groupRect.height;

      card.style.setProperty('--gradient-size-x', `${(100 / wFrac).toFixed(3)}%`);
      card.style.setProperty('--gradient-size-y', `${(100 / hFrac).toFixed(3)}%`);
      card.style.setProperty(
        '--gradient-pos-x',
        wFrac < 0.999 ? `${((xFrac / (1 - wFrac)) * 100).toFixed(3)}%` : '0%',
      );
      card.style.setProperty(
        '--gradient-pos-y',
        hFrac < 0.999 ? `${((yFrac / (1 - hFrac)) * 100).toFixed(3)}%` : '0%',
      );
    }
  };

  const check = (): void => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;

      // Width determines the layout, full stop. No content-driven
      // escalation — long copy may visibly wrap or clip within a mode
      // rather than bumping the whole showcase to a tighter layout.
      // (Per-card description hiding still runs below as a fit pass —
      // that's the only content-aware behaviour left.)
      const floor = widthFloor(cardGroup.clientWidth);
      if (layout !== floor) setLayout(floor);

      // Wait one frame so the class change has applied before measuring
      // descriptions against their slots.
      requestAnimationFrame(() => {
        fitDescriptions();
        updateGradientVars();
      });
    });
  };

  const observer = new ResizeObserver(check);
  observer.observe(cardGroup);
  allCards.forEach((card) => observer.observe(card));
}
