/**
 * Play `<video data-autoplay-on-view>` elements only while they are visible
 * in the viewport; pause them otherwise. Prevents off-screen videos from
 * consuming bandwidth/CPU and avoids the browser playing media the user
 * can't see.
 *
 * The native `autoplay` HTML attribute is intentionally NOT used — it would
 * start playback as soon as metadata loaded, before this observer fires.
 * Instead, the IntersectionObserver is the sole source of truth for play
 * state.
 *
 * Initial-paint behaviour is correct without any extra work: when we call
 * `observer.observe(video)`, the observer immediately delivers a callback
 * with the current intersection state. So videos that are visible at page
 * load start playing on the next microtask — no scroll required. Off-screen
 * videos stay paused until they scroll in.
 *
 * Videos must still have `muted` (and `playsinline` on iOS) for browsers
 * to allow programmatic play() without a user gesture. Both are set by
 * ProjectCard.astro and the rehype-project-media plugin.
 */
export function initMediaAutoplay(): () => void {
  const videos = Array.from(
    document.querySelectorAll<HTMLVideoElement>('video[data-autoplay-on-view]'),
  );
  if (!videos.length) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          // Autoplay may still be blocked (e.g. background tab on some
          // browsers' power-saver heuristics) — ignore the rejection; the
          // observer will retry next time intersection state changes.
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    },
    {
      // 0.1 = at least 10% of the video must be in view to count as
      // "visible". Small enough that videos start before they're fully
      // on-screen (avoids a beat of black at the leading edge), large
      // enough to avoid playing strips of pixel still off-frame.
      threshold: 0.1,
    },
  );

  for (const v of videos) {
    observer.observe(v);
  }

  // After the page has settled, escalate every video's preload from
  // "metadata" to "auto" so the browser fetches frame data in the
  // background. By the time the user scrolls a card into view, the
  // first frames are already buffered. Setting the attribute alone is
  // enough — calling .load() resets the video and forces a re-fetch,
  // which races multiple videos against Safari's concurrent-media
  // limits and can leave one of them stuck.
  const preload = () => {
    for (const v of videos) {
      if (v.preload !== 'auto') v.preload = 'auto';
    }
  };
  if ('requestIdleCallback' in window) {
    (window as Window & typeof globalThis).requestIdleCallback(preload, { timeout: 2000 });
  } else {
    setTimeout(preload, 1000);
  }

  return () => observer.disconnect();
}
