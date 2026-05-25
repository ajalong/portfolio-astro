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
 *
 * --- Preload escalation ---
 *
 * Videos render with `preload="metadata"` (header + first frame only) so the
 * initial page load is cheap. We then upgrade each video to `preload="auto"`
 * lazily, when it enters a "near zone" of ±1 viewport above/below the
 * current scroll position. Far-off videos stay at "metadata" until the user
 * scrolls close to them — keeps the decode pipeline and memory footprint
 * scoped to what's actually about to be needed.
 *
 * Once upgraded we don't downgrade: a video that's been near once is cheap
 * to keep buffered, and toggling preload back and forth would just thrash
 * the cache. Setting the attribute alone is enough — calling .load() resets
 * the video and forces a re-fetch, which races multiple videos against
 * Safari's concurrent-media limits and can leave one stuck.
 *
 * --- Tab visibility ---
 *
 * IntersectionObserver fires for in-viewport changes within a page but not
 * for tab-visibility changes. A separate `visibilitychange` listener pauses
 * every observed video when the tab is hidden and resumes playback for
 * still-visible videos when it returns to the foreground. Browsers do their
 * own background-tab throttling, but explicitly pausing avoids scheduling
 * any decode work for hidden tabs.
 */
export function initMediaAutoplay(): () => void {
  const videos = Array.from(
    document.querySelectorAll<HTMLVideoElement>('video[data-autoplay-on-view]'),
  );
  if (!videos.length) return () => {};

  // Tracks which videos the page wants playing (i.e. are currently in the
  // viewport per the playback observer). Used by the visibilitychange
  // handler to know which ones to resume when the tab comes back.
  const shouldBePlaying = new WeakSet<HTMLVideoElement>();

  // ── Playback observer ──────────────────────────────────────────────────
  // 0.1 = at least 10% of the video must be in view to count as "visible".
  // Small enough that videos start before they're fully on-screen (avoids a
  // beat of black at the leading edge), large enough to avoid playing
  // strips of pixel still off-frame.
  const playbackObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          shouldBePlaying.add(video);
          // Only call play() if the tab is visible — when hidden, the
          // visibilitychange handler will resume on return.
          if (document.visibilityState === 'visible') {
            // Autoplay may still be blocked (e.g. background tab on some
            // browsers' power-saver heuristics) — ignore the rejection; the
            // observer will retry next time intersection state changes.
            video.play().catch(() => {});
          }
        } else {
          shouldBePlaying.delete(video);
          video.pause();
        }
      }
    },
    { threshold: 0.1 },
  );

  // ── Preload observer ───────────────────────────────────────────────────
  // ±1 viewport "near zone". When a video enters, upgrade preload to "auto"
  // so frames are buffered ahead of the user reaching it. Once upgraded we
  // stop observing — preload doesn't need to be downgraded.
  const preloadObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const video = entry.target as HTMLVideoElement;
        if (video.preload !== 'auto') video.preload = 'auto';
        preloadObserver.unobserve(video);
      }
    },
    { rootMargin: '100% 0px' },
  );

  for (const v of videos) {
    playbackObserver.observe(v);
    preloadObserver.observe(v);
  }

  // ── Tab visibility ─────────────────────────────────────────────────────
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // Pause every video. We don't clear `shouldBePlaying` — it represents
      // viewport state, not play state, and tells us what to resume when
      // the tab returns.
      for (const v of videos) v.pause();
    } else {
      // Tab back to foreground — resume anything that's still in view per
      // the playback observer's most recent state.
      for (const v of videos) {
        if (shouldBePlaying.has(v)) v.play().catch(() => {});
      }
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    playbackObserver.disconnect();
    preloadObserver.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
