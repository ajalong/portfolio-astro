/**
 * Click-to-expand lightbox for project media.
 *
 * Behaviour:
 *   - Click any `.media-full img` or `.media-full video` to open. Native
 *     <dialog> handles focus trap + ESC; we preventDefault on `cancel` so
 *     the close animation has time to play before close() is called.
 *   - Clicking anywhere outside the media element closes the dialog
 *     (including the caption — only the media itself blocks the close).
 *   - Body scroll is locked while open; scrollbar width is compensated as
 *     padding-right on body so the page doesn't shift.
 *
 * Layout (caption position):
 *   The dialog gets a `data-caption-position` attribute (`above` or `right`)
 *   set per-open based on the viewport and media aspect ratios. See
 *   pickCaptionPosition() for the rules — implements the explicit "viewport
 *   tall → above; viewport wide + media tall → right" plus the both-tall
 *   edge case where we pick whichever leftover space is larger.
 *
 * Loading:
 *   The in-page src loads instantly (it's already cached from the page
 *   render). In parallel we request a Cloudinary-upgraded URL sized for the
 *   actual lightbox display (display width × DPR, capped at 3200px). When
 *   the upgrade arrives, swap it in. If the in-page src is already wider
 *   than what we need, skip the upgrade entirely.
 */
const HI_RES_CAP_PX = 3200;

// ─── URL optimisation ──────────────────────────────────────────────────

const CLOUDINARY_WIDTH_RE = /\bw_(\d+)/;

function srcWidthFromUrl(url: string): number | null {
  const m = url.match(CLOUDINARY_WIDTH_RE);
  return m ? Number(m[1]) : null;
}

function urlWithWidth(url: string, width: number): string {
  // Only Cloudinary-style URLs (containing `w_<n>`) get the transform; pass
  // anything else through unchanged.
  if (!CLOUDINARY_WIDTH_RE.test(url)) return url;
  return url.replace(/\bw_\d+/g, `w_${width}`);
}

function pickOptimalWidth(viewportW: number, viewportH: number, mediaAR: number): number {
  // Contain-fit the media in the viewport (with a small margin reserved for
  // padding + caption), then upscale by DPR for retina pixels.
  const availW = viewportW * 0.95;
  const availH = viewportH * 0.85;
  const availAR = availW / availH;
  const displayW = availAR > mediaAR ? availH * mediaAR : availW;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(Math.ceil(displayW * dpr), HI_RES_CAP_PX);
}

// ─── Caption position rule ─────────────────────────────────────────────
//
//   1. Viewport portrait (AR ≤ 1)  → caption ABOVE (vertical stack).
//   2. Viewport landscape, media portrait/square → caption RIGHT.
//   3. Viewport landscape, media landscape → caption ABOVE (vertical stack).
//   4. Edge case (both portrait) → contain-fit the media, pick the side
//      with more leftover space.

type CaptionPosition = 'above' | 'right';

function pickCaptionPosition(
  viewportW: number,
  viewportH: number,
  mediaAR: number,
): CaptionPosition {
  const viewportAR = viewportW / viewportH;
  const viewportTall = viewportAR <= 1;
  const mediaTall = mediaAR <= 1;

  if (viewportTall && mediaTall) {
    // Both tall — contain-fit the media to viewport, see whether the
    // leftover space is bigger above/below or beside the media.
    const fitW = Math.min(viewportW, viewportH * mediaAR);
    const fitH = fitW / mediaAR;
    const leftoverV = viewportH - fitH;
    const leftoverH = viewportW - fitW;
    return leftoverH > leftoverV ? 'right' : 'above';
  }

  if (viewportTall) return 'above';
  if (mediaTall) return 'right';
  return 'above';
}

// ─── Aspect ratio detection ────────────────────────────────────────────

function mediaAspectRatio(media: HTMLImageElement | HTMLVideoElement): number {
  if (media instanceof HTMLImageElement) {
    if (media.naturalWidth && media.naturalHeight) {
      return media.naturalWidth / media.naturalHeight;
    }
  } else if (media.videoWidth && media.videoHeight) {
    return media.videoWidth / media.videoHeight;
  }
  // Fallback to attribute dimensions / rendered box.
  const w = media.getBoundingClientRect().width;
  const h = media.getBoundingClientRect().height;
  return w && h ? w / h : 1;
}

// ─── Clone construction ────────────────────────────────────────────────

function buildClone(source: HTMLImageElement | HTMLVideoElement): HTMLElement {
  const mediaAR = mediaAspectRatio(source);
  const optimalW = pickOptimalWidth(window.innerWidth, window.innerHeight, mediaAR);

  if (source instanceof HTMLImageElement) {
    const currentSrc = source.currentSrc || source.src;
    const currentW = srcWidthFromUrl(currentSrc) ?? 0;

    const img = document.createElement('img');
    img.src = currentSrc;
    img.alt = source.alt;
    img.draggable = false;

    // Only swap in an upgraded src if it would actually be larger than what
    // the in-page version already supplies.
    if (optimalW > currentW) {
      const hiResUrl = urlWithWidth(currentSrc, optimalW);
      if (hiResUrl !== currentSrc) {
        const preload = new Image();
        preload.onload = () => {
          if (img.isConnected) img.src = hiResUrl;
        };
        preload.src = hiResUrl;
      }
    }
    return img;
  }

  // Video: same width-upgrade pattern via Cloudinary URL.
  const video = document.createElement('video');
  const currentSrc = source.currentSrc || source.src;
  const currentW = srcWidthFromUrl(currentSrc) ?? 0;
  video.src = currentSrc;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('aria-label', source.getAttribute('aria-label') ?? '');

  if (optimalW > currentW) {
    const hiResUrl = urlWithWidth(currentSrc, optimalW);
    if (hiResUrl !== currentSrc) {
      // For video we just set src to the hi-res URL; the browser will
      // request the new resource and continue playing once metadata loads.
      // Keep the low-res playing in the meantime so the user sees motion.
      // Note: changing video src restarts the stream — minor flicker is
      // acceptable for the quality bump.
      const probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.src = hiResUrl;
      probe.addEventListener(
        'loadedmetadata',
        () => {
          if (video.isConnected) {
            video.src = hiResUrl;
            video.play().catch(() => {});
          }
        },
        { once: true },
      );
    }
  }
  return video;
}

// ─── Caption extraction ────────────────────────────────────────────────
//
// The plugin renders captions as siblings of the figure inside the same
// .media-block: a single .media-caption for solo media, or a
// .media-caption-group with positionally-matched captions for pairs.
// Strip the "(Left) "/"(Right) " prefix span before showing in the lightbox.

function captionFor(media: HTMLImageElement | HTMLVideoElement): string | null {
  const figure = media.closest<HTMLElement>('figure.media-full');
  const block = figure?.parentElement;
  if (!figure || !block) return null;

  const group = block.querySelector(':scope > .media-caption-group');
  if (group) {
    const figures = Array.from(
      block.querySelectorAll<HTMLElement>(':scope > figure.media-full'),
    );
    const idx = figures.indexOf(figure);
    const cap = group.querySelectorAll(':scope > .media-caption')[idx];
    return cap ? cleanCaptionText(cap) : null;
  }

  const single = block.querySelector(':scope > .media-caption');
  return single ? cleanCaptionText(single) : null;
}

function cleanCaptionText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelector('.media-caption__side')?.remove();
  return clone.textContent?.trim() ?? '';
}

// ─── Body scroll lock ──────────────────────────────────────────────────

function lockBodyScroll(): void {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  document.documentElement.style.overflow = 'hidden';
}

function unlockBodyScroll(): void {
  document.documentElement.style.overflow = '';
  document.body.style.paddingRight = '';
}

// ─── Init ──────────────────────────────────────────────────────────────

export function initMediaLightbox(): () => void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-media-lightbox]');
  const mediaSlot = document.querySelector<HTMLElement>('[data-media-lightbox-media]');
  const captionSlot = document.querySelector<HTMLElement>('[data-media-lightbox-caption]');
  if (!dialog || !mediaSlot || !captionSlot) return () => {};

  let busy = false;
  let currentAR = 1;

  // Size the media wrapper to fit the available space (viewport minus
  // dialog padding minus caption + gap) while preserving the media's
  // aspect ratio. Pure-CSS aspect-ratio + flex sizing fight each other
  // (the wrapper either overflows or doesn't compute, depending on
  // direction + alignment), so we compute the box explicitly in JS and
  // set inline width/height on the wrapper.
  //
  // Runs on open and on resize. Caption is measured AFTER it's been laid
  // out (captionSlot.offsetHeight / .offsetWidth) so the fit is based on
  // the actual rendered caption — text length affects the number of lines
  // it wraps to, which affects how much space is left for media.
  const DIALOG_PADDING = 16;
  const GAP = 16;

  function fitMedia(): void {
    if (!dialog.open) return;

    const isAbove = dialog.dataset.captionPosition === 'above';
    const availW = window.innerWidth - DIALOG_PADDING * 2;
    const availH = window.innerHeight - DIALOG_PADDING * 2;

    let wrapperW: number;
    let wrapperH: number;

    if (isAbove) {
      // Caption stacks above; subtract its height + the 16px gap.
      const captionH = captionSlot.offsetHeight;
      const gap = captionH > 0 ? GAP : 0;
      const boxW = availW;
      const boxH = availH - captionH - gap;
      const boxAR = boxW / boxH;
      if (boxAR > currentAR) {
        // Height-constrained — media fills full height, narrower width.
        wrapperH = boxH;
        wrapperW = wrapperH * currentAR;
      } else {
        // Width-constrained — media fills full width, shorter height.
        wrapperW = boxW;
        wrapperH = wrapperW / currentAR;
      }
    } else {
      // Caption to the right; subtract its width + the 16px gap.
      const captionW = captionSlot.offsetWidth;
      const gap = captionW > 0 ? GAP : 0;
      const boxW = availW - captionW - gap;
      const boxH = availH;
      const boxAR = boxW / boxH;
      if (boxAR > currentAR) {
        wrapperH = boxH;
        wrapperW = wrapperH * currentAR;
      } else {
        wrapperW = boxW;
        wrapperH = wrapperW / currentAR;
      }
    }

    mediaSlot.style.width = `${wrapperW}px`;
    mediaSlot.style.height = `${wrapperH}px`;
  }

  function open(media: HTMLImageElement | HTMLVideoElement): void {
    if (busy) return;
    busy = true;

    currentAR = mediaAspectRatio(media);
    dialog.dataset.captionPosition = pickCaptionPosition(
      window.innerWidth,
      window.innerHeight,
      currentAR,
    );

    const clone = buildClone(media);
    mediaSlot.replaceChildren(clone);
    captionSlot.textContent = captionFor(media) ?? '';

    // showModal would normally scroll the dialog into view (top:0 anchor).
    // Preserve the user's scroll position by capturing + restoring.
    const scrollY = window.scrollY;
    dialog.showModal();
    if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);

    // showModal auto-focuses the first focusable descendant (the close
    // button) and some browsers apply :focus-visible to that programmatic
    // focus — visible outline on open even though the user clicked, not
    // keyboarded, to get here. Blur it so the focus ring doesn't show
    // initially; keyboard users can still tab to focus (and that focus
    // WILL trigger :focus-visible properly).
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused !== document.body) {
      focused.blur();
    }

    lockBodyScroll();

    // Size the wrapper now that the dialog is open and the caption has
    // a measurable height/width.
    fitMedia();

    if (clone instanceof HTMLVideoElement) clone.play().catch(() => {});

    // Match the CSS fade duration so the busy lock matches the visual.
    setTimeout(() => {
      busy = false;
    }, 220);
  }

  async function close(): Promise<void> {
    if (busy) return;
    busy = true;

    dialog.classList.add('is-closing');
    // Wait for the fade-out to play. We use a fixed timeout matching the
    // CSS --dur-fast (200ms) + a small buffer rather than tracking the
    // transitionend event — opacity transitions can stack with the
    // backdrop's transition and the event firing order is unreliable.
    await new Promise((resolve) => setTimeout(resolve, 220));

    mediaSlot.replaceChildren();
    captionSlot.textContent = '';
    mediaSlot.style.width = '';
    mediaSlot.style.height = '';
    delete dialog.dataset.captionPosition;
    dialog.classList.remove('is-closing');
    dialog.close();
    unlockBodyScroll();
    busy = false;
  }

  const onMediaClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const media = target.closest<HTMLImageElement | HTMLVideoElement>(
      '.media-full img, .media-full video',
    );
    if (!media) return;
    event.preventDefault();
    open(media);
  };

  // Any click anywhere inside the dialog closes — media, caption, backdrop,
  // close button all bubble up here and trigger close(). No stopPropagation
  // on the media: the whole lightbox is a "click to dismiss" surface.
  const onDialogClick = (): void => {
    close();
  };

  // ESC fires `cancel` before the native instant-close — preventDefault
  // lets the fade-out animation play before we actually close the dialog.
  const onCancel = (event: Event): void => {
    event.preventDefault();
    close();
  };

  document.body.addEventListener('click', onMediaClick);
  dialog.addEventListener('click', onDialogClick);
  dialog.addEventListener('cancel', onCancel);
  window.addEventListener('resize', fitMedia);

  return () => {
    document.body.removeEventListener('click', onMediaClick);
    dialog.removeEventListener('click', onDialogClick);
    dialog.removeEventListener('cancel', onCancel);
    window.removeEventListener('resize', fitMedia);
    if (dialog.open) {
      unlockBodyScroll();
      dialog.close();
    }
  };
}
