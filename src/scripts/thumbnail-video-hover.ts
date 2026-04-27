/**
 * Marks `<video data-thumbnail-video>` elements `.is-loaded` once the first
 * frame is decoded so the CSS can fade them in (mirroring the `<img>`
 * thumbnails handled in BaseLayout).
 *
 * Playback is driven by media-autoplay's IntersectionObserver — visible
 * cards play, off-screen cards pause. Hover does not interfere.
 */

export function initThumbnailVideoHover(): () => void {
  const videos = Array.from(
    document.querySelectorAll<HTMLVideoElement>('video[data-thumbnail-video]'),
  );
  if (!videos.length) return () => {};

  for (const video of videos) {
    const markLoaded = () => video.classList.add('is-loaded');
    if (video.readyState >= 2) {
      markLoaded();
    } else {
      video.addEventListener('loadeddata', markLoaded, { once: true });
    }
  }

  return () => {};
}
