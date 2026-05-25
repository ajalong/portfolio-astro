/**
 * Tracks which article section is "currently active" via IntersectionObserver.
 *
 * Active = the topmost section whose top edge has crossed the viewport's
 * 50% line. This bias matches the user's reading position rather than
 * literal viewport-top intersection, so the active item flips over as
 * the reader scrolls past each section heading.
 *
 * Both nav variants (NavLg sidebar, NavSd dropdown) subscribe
 * here so they stay in lockstep without coupling to each other's DOM. Each
 * subscriber receives the active section id whenever it changes (and once
 * immediately on subscribe, for initial paint).
 *
 * Usage:
 *   const cleanup = trackActiveSection(targetEls, (activeId) => { … });
 *   // …later, on teardown:
 *   cleanup();
 */
type ActiveSectionListener = (activeId: string | null) => void;
type CleanupFn = () => void;

export function trackActiveSection(
  targets: HTMLElement[],
  onChange: ActiveSectionListener,
): CleanupFn {
  if (targets.length === 0) {
    onChange(null);
    return () => {};
  }

  let currentActive: string | null = null;

  const compute = (): string | null => {
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const visible = targets
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        // Top above the 50% line and bottom still below the viewport top.
        return rect.top <= viewportH * 0.5 && rect.bottom > 0;
      })
      .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
    return visible[0]?.id ?? null;
  };

  const notifyIfChanged = (): void => {
    const next = compute();
    if (next !== currentActive) {
      currentActive = next;
      onChange(next);
    }
  };

  const observer = new IntersectionObserver(notifyIfChanged, {
    // Bias the "visible" area to the top half so the active item flips as
    // each section's heading crosses the upper-third reading line.
    rootMargin: '0px 0px -50% 0px',
    threshold: [0, 0.1, 0.5, 1],
  });
  for (const target of targets) observer.observe(target);

  // Initial state — covers page-load-already-scrolled (back nav, anchor open).
  currentActive = compute();
  onChange(currentActive);

  return () => observer.disconnect();
}
