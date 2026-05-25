// Fade marginal/inline captions as they scroll under the project page's
// active nav. Two navs are in play depending on viewport: NavLg (sticky,
// at $breakpoint-large+) and NavSd (fixed top bar, below large). Either
// one can sit over scrolling content, so we read whichever has a non-
// zero bounding rect and treat its bottom edge as the fade threshold.
//
// CSS scroll-driven animations (animation-timeline: view()) would be the
// natural fit, but browser support is still uneven; this JS version is
// bullet-proof and lets us read each nav's actual position rather than
// approximating it.
export function initCaptionFade() {
  const navs = [
    document.querySelector('.nav-lg'),
    document.querySelector('.nav-sd'),
  ].filter(Boolean);
  const captions = document.querySelectorAll('.media-caption, .media-caption-group');

  if (navs.length === 0 || captions.length === 0) return;

  const FADE_PX = 56;

  function update() {
    // Whichever nav is currently visible — take its bottom edge as the
    // threshold. Hidden navs (display: none, or unmounted) give 0 0 0 0
    // for getBoundingClientRect, so filtering on `height > 0` picks the
    // active one regardless of viewport width.
    let navBottom = 0;
    for (const nav of navs) {
      const r = nav.getBoundingClientRect();
      if (r.height > 0 && r.bottom > navBottom) navBottom = r.bottom;
    }

    captions.forEach((cap) => {
      const top = cap.getBoundingClientRect().top;
      const dist = top - navBottom;
      if (dist >= FADE_PX) {
        cap.style.opacity = '';
      } else if (dist <= 0) {
        cap.style.opacity = '0';
      } else {
        cap.style.opacity = dist / FADE_PX;
      }
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();

  return () => window.removeEventListener('scroll', update);
}
