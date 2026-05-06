// Swap the page's --brand-primary / --brand-secondary to the next
// project's pair when the next-project card scrolls into view, and back
// to the current project's pair when it scrolls out. The @property
// registration on those vars in _background.scss handles the smooth
// transition; this script just toggles the values on <body>.

export function initNextProjectBrandSwap(): () => void {
  const card = document.querySelector<HTMLElement>('[data-next-project-brand]');
  if (!card) return () => {};

  const nextPrimary = card.dataset.brandPrimary;
  const nextSecondary = card.dataset.brandSecondary;
  if (!nextPrimary || !nextSecondary) return () => {};

  const body = document.body;
  // Stash the current project's brand pair (set inline by BaseLayout).
  // The IO callback restores these when the next-project card leaves view.
  const thisPrimary = body.style.getPropertyValue('--brand-primary');
  const thisSecondary = body.style.getPropertyValue('--brand-secondary');

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        body.style.setProperty('--brand-primary', nextPrimary);
        body.style.setProperty('--brand-secondary', nextSecondary);
      } else {
        body.style.setProperty('--brand-primary', thisPrimary);
        body.style.setProperty('--brand-secondary', thisSecondary);
      }
    },
    {
      // Trigger when ~30 % of the card has entered the viewport — by that
      // point the user is clearly approaching the bottom of the page.
      threshold: 0.3,
    },
  );

  observer.observe(card);
  return () => observer.disconnect();
}
