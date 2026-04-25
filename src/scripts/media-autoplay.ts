/**
 * Play autoplaying videos only while they are visible in the viewport;
 * pause them when they scroll out. Prevents off-screen videos from
 * consuming resources and avoids the browser playing media the user can't see.
 *
 * Targets <video autoplay> elements. The `autoplay` attribute is left in place
 * so the browser's native behaviour handles the initial play on page load
 * (before the observer fires), but we override play/pause from here.
 */
export function initMediaAutoplay(): () => void {
  const videos = Array.from(
    document.querySelectorAll<HTMLVideoElement>('video[autoplay]'),
  );
  if (!videos.length) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          video.play().catch(() => {
            // Autoplay may still be blocked in some contexts — ignore.
          });
        } else {
          video.pause();
        }
      });
    },
    { threshold: 0.1 },
  );

  videos.forEach((v) => observer.observe(v));

  return () => observer.disconnect();
}
