// Homepage gradient swap. Each project list item carries data-light /
// data-dark; the observer picks whichever has the largest intersection with
// a horizontal band across the viewport's vertical centre and writes its
// pair to :root. The CSS @property + transition handles the actual fade.
export function initBackgroundObserver(): void {
  const root = document.documentElement;
  const sections = document.querySelectorAll<HTMLElement>(
    '[data-bg-section][data-light][data-dark]'
  );
  if (sections.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length === 0) return;
      const top = visible.reduce((a, b) =>
        b.intersectionRatio > a.intersectionRatio ? b : a,
      );
      const { light, dark } = (top.target as HTMLElement).dataset;
      if (light) root.style.setProperty('--c-light', light);
      if (dark) root.style.setProperty('--c-dark', dark);
    },
    {
      // Active band ≈ middle 20% of the viewport. A section's pair applies
      // while the user is reading near its centre.
      rootMargin: '-40% 0px -40% 0px',
      threshold: [0, 0.5, 1],
    },
  );

  sections.forEach((s) => observer.observe(s));
}
