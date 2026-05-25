/**
 * Three responsibilities for the showcase:
 *
 *  1. Layout switching across three states:
 *
 *       desktop   ⇌   compact   ⇌   ultraNarrow
 *
 *     - desktop → compact: any content-bearing card overflows its
 *       bento allocation (e.g. metric label clipped, feature copy
 *       doesn't fit in row 1's 2fr allocation).
 *     - compact → ultraNarrow: the feature card's content has pushed
 *       it taller than wide. In the side-by-side compact arrangement
 *       this means h2 wrapping has consumed enough vertical space
 *       that A no longer reads as a "feature card" — switch to a
 *       pure vertical stack.
 *
 *     Reverse transitions use width hysteresis (10%) to prevent
 *     ping-pong at the boundary widths.
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
 * Why JS instead of pure CSS: CSS can't detect content overflow,
 * and container queries only know the container's dimensions, not
 * its content's. A hardcoded width threshold is content-fragile
 * (different case studies have different metric label lengths,
 * future copy edits move the goalposts). Measuring at runtime is
 * content-correct.
 */

type Layout = 'desktop' | 'compact' | 'ultraNarrow';

const HEADROOM = 1.1;

export function initShowcaseOverflowObservers(): void {
  document.querySelectorAll<HTMLElement>('.project-showcase').forEach(initOne);
}

function initOne(showcase: HTMLElement): void {
  const cardGroup = showcase.querySelector<HTMLElement>('.card-group');
  if (!cardGroup) return;

  const allCards = Array.from(cardGroup.children).filter(
    (c): c is HTMLElement => c instanceof HTMLElement,
  );

  // Cards that can overflow — feature (free-flowing copy) and metric
  // cards (rigid `overflow: hidden`, content clips silently). Media
  // cards hold an `<img>` with object-fit: contain; can't overflow.
  const overflowCards = allCards.filter(
    (c) =>
      c.classList.contains('metric-card') ||
      c.classList.contains('project-showcase__card--feature'),
  );

  const featureCard = allCards.find((c) =>
    c.classList.contains('project-showcase__card--feature'),
  );

  let layout: Layout = 'desktop';
  let lastOverflowWidth = 0; // width when desktop→compact fired
  let lastCrampWidth = 0; // width when compact→ultraNarrow fired
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

  const hasOverflow = (): boolean =>
    overflowCards.some((card) => card.scrollHeight > card.clientHeight + 1);

  // "Cramped" = feature card's content has forced it taller than wide.
  // Meaningful signal that the compact side-by-side arrangement has
  // outgrown its usefulness and we should switch to the vertical stack.
  const isCramped = (): boolean => {
    if (!featureCard) return false;
    const w = featureCard.clientWidth;
    const h = featureCard.clientHeight;
    return w > 0 && h > w;
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
      const width = showcase.clientWidth;

      if (layout === 'desktop') {
        if (hasOverflow()) {
          lastOverflowWidth = width;
          setLayout('compact');
          // Compact may itself be cramped — after layout settles, check
          // if we should immediately step further to ultra-narrow.
          requestAnimationFrame(() => {
            if (isCramped()) {
              lastCrampWidth = showcase.clientWidth;
              setLayout('ultraNarrow');
            }
            updateGradientVars();
          });
          return;
        }
        updateGradientVars();
        return;
      }

      if (layout === 'compact') {
        // Cramp check first — if A's content has wrapped enough to
        // make the side-by-side feel wrong, go to ultra-narrow.
        if (isCramped()) {
          lastCrampWidth = width;
          setLayout('ultraNarrow');
          requestAnimationFrame(updateGradientVars);
          return;
        }
        // Otherwise consider going back to desktop, with width
        // hysteresis to prevent oscillation.
        if (lastOverflowWidth === 0 || width > lastOverflowWidth * HEADROOM) {
          setLayout('desktop');
          requestAnimationFrame(() => {
            if (hasOverflow()) {
              lastOverflowWidth = showcase.clientWidth;
              setLayout('compact');
              // Possible cascade — desktop overflow may also trigger
              // ultra-narrow at this width.
              requestAnimationFrame(() => {
                if (isCramped()) {
                  lastCrampWidth = showcase.clientWidth;
                  setLayout('ultraNarrow');
                }
                updateGradientVars();
              });
              return;
            }
            updateGradientVars();
          });
          return;
        }
        updateGradientVars();
        return;
      }

      // layout === 'ultraNarrow'
      // Try compact when wider than the last cramp width by headroom.
      if (lastCrampWidth === 0 || width > lastCrampWidth * HEADROOM) {
        setLayout('compact');
        requestAnimationFrame(() => {
          if (isCramped()) {
            lastCrampWidth = showcase.clientWidth;
            setLayout('ultraNarrow');
          }
          updateGradientVars();
        });
        return;
      }
      updateGradientVars();
    });
  };

  const observer = new ResizeObserver(check);
  observer.observe(cardGroup);
  allCards.forEach((card) => observer.observe(card));
}
