/**
 * Click-to-expand lightbox for project media. The clicked image/video
 * appears to "lift out of the page" via a FLIP transform: the clone is
 * inserted at its target size, animated from the source rect to identity.
 * Closing reverses the same transform. The matching caption (the short
 * text shown in the page margin) is rendered as a white card below.
 *
 * Native <dialog> handles ESC and focus trap; the cancel event is
 * preventDefault'd so the exit animation can complete before close().
 *
 * Cloudinary URLs are upgraded `w_1800` → `w_2800` for the larger viewport;
 * the in-page (already-cached) src loads first and the high-res swaps in
 * once available, so the user sees content immediately.
 */
const HI_RES_WIDTH = 2800;
const DURATION_MS = 320;
const EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';

function upgradeCloudinary(src: string): string {
  return src.replace(/\bw_\d+/g, `w_${HI_RES_WIDTH}`);
}

function buildClone(source: HTMLImageElement | HTMLVideoElement): HTMLElement {
  if (source instanceof HTMLImageElement) {
    const lowRes = source.currentSrc || source.src;
    const highRes = upgradeCloudinary(lowRes);
    const img = document.createElement('img');
    img.src = lowRes;
    img.alt = source.alt;
    img.draggable = false;
    if (highRes !== lowRes) {
      const preload = new Image();
      preload.onload = () => {
        if (img.isConnected) img.src = highRes;
      };
      preload.src = highRes;
    }
    return img;
  }
  const video = document.createElement('video');
  video.src = source.currentSrc || source.src;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('aria-label', source.getAttribute('aria-label') ?? '');
  return video;
}

function flipTransform(fromRect: DOMRect, toRect: DOMRect): string {
  const dx = fromRect.left - toRect.left;
  const dy = fromRect.top - toRect.top;
  const sx = fromRect.width / toRect.width || 1;
  const sy = fromRect.height / toRect.height || 1;
  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
}

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

export function initMediaLightbox(): () => void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-media-lightbox]');
  const slot = document.querySelector<HTMLElement>('[data-media-lightbox-content]');
  if (!dialog || !slot) return () => {};

  let source: HTMLImageElement | HTMLVideoElement | null = null;
  let clone: HTMLElement | null = null;
  let busy = false;

  function open(media: HTMLImageElement | HTMLVideoElement) {
    if (busy) return;
    busy = true;

    const sourceRect = media.getBoundingClientRect();
    const c = buildClone(media);
    const captionText = captionFor(media);

    const children: Node[] = [c];
    if (captionText) {
      const cap = document.createElement('p');
      cap.className = 'media-lightbox__caption';
      cap.textContent = captionText;
      children.push(cap);
    }
    slot.replaceChildren(...children);
    source = media;
    clone = c;

    // showModal would otherwise focus the dialog and the browser would
    // scroll its top: 0 anchor into view; restore the user's scroll.
    const scrollY = window.scrollY;
    dialog.showModal();
    if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);

    // WAAPI runs the FLIP independently of the layout/paint pipeline so
    // it doesn't get coalesced into the same frame as the open call.
    const targetRect = c.getBoundingClientRect();
    c.animate(
      [
        { transform: flipTransform(sourceRect, targetRect), transformOrigin: '0 0' },
        { transform: 'none', transformOrigin: '0 0' },
      ],
      { duration: DURATION_MS, easing: EASING, fill: 'none' },
    );

    if (c instanceof HTMLVideoElement) c.play().catch(() => {});
    setTimeout(() => { busy = false; }, DURATION_MS);
  }

  async function close() {
    if (busy || !clone || !source) return;
    busy = true;

    const c = clone;
    const s = source;
    const sourceRect = s.getBoundingClientRect();
    const targetRect = c.getBoundingClientRect();

    dialog.classList.add('is-closing');
    const anim = c.animate(
      [
        { transform: 'none', transformOrigin: '0 0' },
        { transform: flipTransform(sourceRect, targetRect), transformOrigin: '0 0' },
      ],
      { duration: DURATION_MS, easing: EASING, fill: 'forwards' },
    );

    await Promise.race([
      anim.finished.catch(() => {}),
      new Promise((r) => setTimeout(r, DURATION_MS + 100)),
    ]);

    slot.replaceChildren();
    dialog.classList.remove('is-closing');
    dialog.close();
    source = null;
    clone = null;
    busy = false;
  }

  const onMediaClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const media = target.closest<HTMLImageElement | HTMLVideoElement>(
      '.media-full img, .media-full video',
    );
    if (!media) return;
    event.preventDefault();
    open(media);
  };

  const onDialogClick = (event: MouseEvent) => {
    if (event.target === dialog) close();
  };

  // ESC fires `cancel` first; preventDefault stops the native instant-close
  // so the exit animation has time to run before dialog.close().
  const onCancel = (event: Event) => {
    event.preventDefault();
    close();
  };

  document.body.addEventListener('click', onMediaClick);
  dialog.addEventListener('click', onDialogClick);
  dialog.addEventListener('cancel', onCancel);

  return () => {
    document.body.removeEventListener('click', onMediaClick);
    dialog.removeEventListener('click', onDialogClick);
    dialog.removeEventListener('cancel', onCancel);
  };
}
