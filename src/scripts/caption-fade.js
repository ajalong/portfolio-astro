export function initCaptionFade() {
  const nav = document.querySelector('.project-section-index');
  const captions = document.querySelectorAll('.media-caption');

  if (!nav || !captions.length) return;

  const FADE_PX = 56;

  function update() {
    const navBottom = nav.getBoundingClientRect().bottom;
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
