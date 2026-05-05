// Homepage brand-colour swap. Each project list item carries the case
// study's brand colours as data-brand-primary / data-brand-secondary; the
// observer picks whichever has the largest intersection with a horizontal
// band across the viewport's vertical centre and writes its pair to :root.
// The @property registration on --brand-primary / --brand-secondary plus
// the transition in _background.scss handles the actual fade.
export function initBackgroundObserver(): void {
  const root = document.documentElement;
  const sections = document.querySelectorAll<HTMLElement>(
    '[data-bg-section][data-brand-primary][data-brand-secondary]'
  );
  if (sections.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length === 0) return;
      const top = visible.reduce((a, b) =>
        b.intersectionRatio > a.intersectionRatio ? b : a,
      );
      const { brandPrimary, brandSecondary } = (top.target as HTMLElement).dataset;
      if (brandPrimary) root.style.setProperty('--brand-primary', brandPrimary);
      if (brandSecondary) root.style.setProperty('--brand-secondary', brandSecondary);
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
