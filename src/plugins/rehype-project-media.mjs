/**
 * Rehype plugin for project markdown.
 *
 * Authoring contract:
 *   - A single markdown image on its own becomes a full-width figure (cols 2–7).
 *   - Two consecutive markdown images (no blank line between) become a side-by-side
 *     pair: left image in cols 2–4, right in cols 5–7.
 *   - Captions (the alt text, or the part before " — " in "Caption — Alt") are
 *     placed in the page margin: right margin (col 8) for single images and the
 *     right image of a pair; left margin (col 1) for the left image of a pair.
 *   - .mp4 / .webm / .mov sources render as <video data-autoplay-on-view>
 *     (no native `autoplay` attribute — playback is JS-driven by
 *     `initMediaAutoplay` so off-screen videos never start) instead of <img>.
 *   - Cloudinary URLs are auto-optimised with f_auto, q_auto, and a width cap.
 *
 * Emits:
 *   <div class="media-block">
 *     <figure class="media-full">…</figure>
 *     <p class="media-caption media-caption--right">Caption</p>
 *   </div>
 *
 *   <div class="media-block media-block--pair">
 *     <figure class="media-full">…</figure>
 *     <figure class="media-full">…</figure>
 *     <p class="media-caption media-caption--left">Left caption</p>
 *     <p class="media-caption media-caption--right">Right caption</p>
 *   </div>
 */
import { visit } from 'unist-util-visit';

const VIDEO_EXT = /\.(mp4|webm|mov)(\?.*)?$/i;
const CLOUDINARY_IMAGE_RE = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;
const CLOUDINARY_VIDEO_RE = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//;

const CLOUDINARY_TRANSFORM_PREFIX = /^(?:a|ar|b|bo|c|co|dpr|e|f|fl|g|h|l|o|q|r|t|u|w|x|y|z)_/;

// srcset widths cover small-mobile through retina-desktop. Browsers pick the
// lightest viable file based on the `sizes` attribute and DPR.
const IMAGE_SRCSET_WIDTHS = [480, 800, 1200, 1800];
// Single-src width — used for the `src` fallback and as the LCP-eligible URL.
const IMAGE_DEFAULT_WIDTH = 1200;
const VIDEO_DEFAULT_WIDTH = 1600;

// `sizes` attribute by layout context. Values are the rendered CSS width.
// Single full-width image: cols 2–5 of a 6-col article grid on ≥1000 px,
// full-bleed minus page padding on mobile.
const SIZES_FULL = '(min-width: 1000px) 60vw, 92vw';
// Pair: half of the article grid on ≥1000 px, half-viewport on mobile (the
// pair stays 2-col at all sizes per `_project-layout.scss`).
const SIZES_PAIR = '(min-width: 1000px) 30vw, 46vw';

function optimizeCloudinaryUrl(src, isVideo, widthOverride) {
  const re = isVideo ? CLOUDINARY_VIDEO_RE : CLOUDINARY_IMAGE_RE;
  if (!re.test(src)) return src;

  const prefix = src.match(re)[0];
  const rest = src.slice(prefix.length);
  const parts = rest.split('/');

  const transformSegments = [];
  let publicIdStart = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (CLOUDINARY_TRANSFORM_PREFIX.test(part) || /^v\d+$/.test(part)) {
      transformSegments.push(part);
      publicIdStart = i + 1;
    } else {
      break;
    }
  }

  // When a width is explicitly requested (per srcset entry), drop any pre-set
  // width / c_limit so we replace them. Other transforms (f_*, q_*, fl_*,
  // e_*, b_*, etc.) are preserved.
  const segments = widthOverride !== undefined
    ? transformSegments.filter((s) => !/^w_\d/.test(s) && s !== 'c_limit')
    : transformSegments;

  const existingParams = segments.join(',');
  const publicId = parts.slice(publicIdStart).join('/');
  const isGif = /\.gif$/i.test(publicId);

  const missing = [];
  if (!/\bf_auto\b/.test(existingParams)) missing.push('f_auto');
  if (!/\bq_auto\b/.test(existingParams)) missing.push('q_auto:best');
  // Animated GIFs need fl_animated so Cloudinary preserves animation when
  // converting to WebP/AVIF via f_auto.
  if (isGif && !/\bfl_animated\b/.test(existingParams)) missing.push('fl_animated');
  if (widthOverride !== undefined) {
    missing.push('c_limit', 'w_' + widthOverride);
  } else if (!isVideo && !/\b[wc]_\d/.test(existingParams)) {
    // Backward-compat: legacy single-src callers with no width hint still
    // get a sensible cap.
    missing.push('c_limit', 'w_' + IMAGE_DEFAULT_WIDTH);
  }

  if (!missing.length) return src;

  const allTransforms = [...segments, ...missing].filter(Boolean);
  return prefix + allTransforms.join(',') + '/' + publicId;
}

// Build a Cloudinary srcset for a markdown image. Returns null for
// non-Cloudinary URLs (so the figure falls back to a plain <img src>).
function buildCloudinarySrcset(src) {
  if (!CLOUDINARY_IMAGE_RE.test(src)) return null;
  return IMAGE_SRCSET_WIDTHS
    .map((w) => `${optimizeCloudinaryUrl(src, false, w)} ${w}w`)
    .join(', ');
}

// Returns { figure, captionText } — caption is placed in the page margin, not inside figure.
function buildFigure(img, { isPair = false } = {}) {
  const src = img.properties?.src ?? '';
  const alt = img.properties?.alt ?? '';
  const isVideo = VIDEO_EXT.test(src);

  // "Caption — Detailed description": caption → margin, description → alt/aria-label.
  const separatorIdx = alt.indexOf(' — ');
  const captionText = separatorIdx !== -1 ? alt.slice(0, separatorIdx) : alt;
  const altText = separatorIdx !== -1 ? alt.slice(separatorIdx + 3) : alt;

  let mediaChild;
  if (isVideo) {
    mediaChild = {
      type: 'element',
      tagName: 'video',
      properties: {
        src: optimizeCloudinaryUrl(src, true, VIDEO_DEFAULT_WIDTH),
        // No native `autoplay` — initMediaAutoplay starts/stops playback
        // based on viewport visibility. Visible-on-load videos still start
        // immediately because IntersectionObserver fires synchronously on
        // observe() with the current intersection state.
        loop: true,
        muted: true,
        playsInline: true,
        'data-autoplay-on-view': '',
        'aria-label': altText || undefined,
      },
      children: [],
    };
  } else {
    const srcset = buildCloudinarySrcset(src);
    mediaChild = {
      ...img,
      properties: {
        ...img.properties,
        src: optimizeCloudinaryUrl(src, false, IMAGE_DEFAULT_WIDTH),
        srcset: srcset || undefined,
        sizes: srcset ? (isPair ? SIZES_PAIR : SIZES_FULL) : undefined,
        alt: altText,
        draggable: false,
      },
    };
  }

  return {
    figure: {
      type: 'element',
      tagName: 'figure',
      properties: { className: ['media-full'] },
      children: [mediaChild],
    },
    captionText: captionText || null,
  };
}

function makeCaptionEl(text, side) {
  const cls = side ? ['media-caption', `media-caption--${side}`] : ['media-caption'];
  return {
    type: 'element',
    tagName: 'p',
    properties: { className: cls },
    children: [{ type: 'text', value: text }],
  };
}

// Caption for a pair where the side ("Left"/"Right") is rendered as a
// separately-classed prefix span so CSS can hide it on mobile (where the
// caption already sits beneath its image and the prefix is redundant).
function makePairCaptionEl(sideLabel, text) {
  return {
    type: 'element',
    tagName: 'p',
    properties: { className: ['media-caption'] },
    children: [
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['media-caption__side'] },
        children: [{ type: 'text', value: `(${sideLabel}) ` }],
      },
      { type: 'text', value: text },
    ],
  };
}

// Wraps multiple caption <p>s in a single grid item so they occupy one cell
// in col 8 and can bottom-align as a group.
function makeCaptionGroup(captionEls) {
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: ['media-caption-group'] },
    children: captionEls,
  };
}

function makeMediaBlock(figures, captions, isPair) {
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: isPair ? ['media-block', 'media-block--pair'] : ['media-block'] },
    children: [...figures, ...captions],
  };
}

// An "image paragraph": <p> containing only <img>s (any whitespace between).
function imageParagraphImgs(node) {
  if (node.type !== 'element' || node.tagName !== 'p') return null;
  const kids = node.children ?? [];
  const imgs = kids.filter((c) => c.type === 'element' && c.tagName === 'img');
  if (!imgs.length) return null;
  const allImgs = kids.every(
    (c) =>
      (c.type === 'element' && c.tagName === 'img') ||
      (c.type === 'text' && /^\s*$/.test(c.value ?? '')),
  );
  return allImgs ? imgs : null;
}

export default function rehypeProjectMedia() {
  return (tree) => {
    const processChildren = (node) => {
      if (!Array.isArray(node.children)) return;

      const next = [];
      let i = 0;
      const n = node.children.length;

      while (i < n) {
        const child = node.children[i];
        const imgs = imageParagraphImgs(child);

        if (!imgs) {
          next.push(child);
          i++;
          continue;
        }

        if (imgs.length === 1) {
          const { figure, captionText } = buildFigure(imgs[0], { isPair: false });
          const captions = captionText ? [makeCaptionEl(captionText, 'right')] : [];
          next.push(makeMediaBlock([figure], captions, false));
        } else {
          // 2+ images in same paragraph → pairs; odd trailing → full-width.
          for (let k = 0; k < imgs.length; k += 2) {
            const rightImg = imgs[k + 1];
            const isPair = !!rightImg;
            const left = buildFigure(imgs[k], { isPair });
            if (!rightImg) {
              const captions = left.captionText ? [makeCaptionEl(left.captionText, 'right')] : [];
              next.push(makeMediaBlock([left.figure], captions, false));
            } else {
              const right = buildFigure(rightImg, { isPair: true });
              const innerCaptions = [
                ...(left.captionText ? [makePairCaptionEl('Left', left.captionText)] : []),
                ...(right.captionText ? [makePairCaptionEl('Right', right.captionText)] : []),
              ];
              const captions = innerCaptions.length ? [makeCaptionGroup(innerCaptions)] : [];
              next.push(makeMediaBlock([left.figure, right.figure], captions, true));
            }
          }
        }
        i++;
      }

      node.children = next;
    };

    processChildren(tree);
    visit(tree, 'element', processChildren);
  };
}
