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

// `widthOverride` semantics:
//   number    — replace any existing width with this one (used per srcset entry)
//   null      — don't add any width transform; preserve original dimensions
//               (needed for animated GIFs — Cloudinary 400s on any resize over
//               its 50 MP-across-all-frames quota)
//   undefined — legacy default: cap to IMAGE_DEFAULT_WIDTH if no width present
function optimizeCloudinaryUrl(src, isVideo, widthOverride) {
  const re = isVideo ? CLOUDINARY_VIDEO_RE : CLOUDINARY_IMAGE_RE;
  if (!re.test(src)) return src;

  const prefix = src.match(re)[0];
  const rest = src.slice(prefix.length);
  const parts = rest.split('/');

  // Cloudinary URL structure: /<transform-segment>(?:/<transform-segment>)*?/<v\d+>?/<publicId>
  // Transform segments are comma-separated lists of params (e.g. `f_auto,q_auto,c_limit,w_1600`).
  // Versions (`v\d+`) sit on their own slash-segment between transforms and the publicId.
  // Walk path parts, classifying each as a transform list, a version, or the start of publicId.
  const segs = []; // [{ kind: 'transform', params: string[] } | { kind: 'version', value: string }]
  let publicIdStart = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^v\d+$/.test(part)) {
      segs.push({ kind: 'version', value: part });
      publicIdStart = i + 1;
      continue;
    }
    const params = part.split(',');
    if (params.length > 0 && params.every((p) => CLOUDINARY_TRANSFORM_PREFIX.test(p))) {
      segs.push({ kind: 'transform', params });
      publicIdStart = i + 1;
      continue;
    }
    break;
  }

  const hasExplicitWidth = typeof widthOverride === 'number';
  const skipWidth = widthOverride === null;

  // When a width is explicitly requested (per srcset entry) or explicitly
  // skipped, drop any pre-set numeric width / c_limit from EVERY transform
  // segment so we control them. Other transforms (f_*, q_*, fl_*, e_*, b_*,
  // c_fill, w_auto, etc.) are preserved.
  if (hasExplicitWidth || skipWidth) {
    for (const seg of segs) {
      if (seg.kind !== 'transform') continue;
      seg.params = seg.params.filter((p) => !/^w_\d/.test(p) && p !== 'c_limit');
    }
  }

  // Aggregate all transform params across segments to look up f_auto/q_auto/etc.
  const allParams = segs.flatMap((s) => (s.kind === 'transform' ? s.params : []));
  const allParamsString = allParams.join(',');
  const publicId = parts.slice(publicIdStart).join('/');
  const isGif = /\.gif$/i.test(publicId);

  const additions = [];
  if (!/\bf_auto\b/.test(allParamsString)) additions.push('f_auto');
  if (!/\bq_auto\b/.test(allParamsString)) additions.push('q_auto:best');
  // Animated GIFs need fl_animated so Cloudinary preserves animation when
  // converting to WebP/AVIF via f_auto.
  if (isGif && !/\bfl_animated\b/.test(allParamsString)) additions.push('fl_animated');
  if (hasExplicitWidth) {
    additions.push('c_limit', 'w_' + widthOverride);
  } else if (!skipWidth && !isVideo && !/\b[wc]_\d/.test(allParamsString)) {
    // Backward-compat: legacy single-src callers with no width hint still
    // get a sensible cap.
    additions.push('c_limit', 'w_' + IMAGE_DEFAULT_WIDTH);
  }

  if (additions.length === 0 && !(hasExplicitWidth || skipWidth)) return src;

  // Append additions to the first transform segment (or create one). Versions
  // stay where they are. This keeps the URL canonical: transforms then
  // optional version then publicId, each on their own slash-segment.
  const firstTransform = segs.find((s) => s.kind === 'transform');
  if (firstTransform) {
    firstTransform.params.push(...additions);
  } else if (additions.length) {
    segs.unshift({ kind: 'transform', params: additions });
  }

  const segStrings = segs
    .map((s) => (s.kind === 'transform' ? s.params.join(',') : s.value))
    .filter((s) => s !== '');
  return prefix + segStrings.join('/') + '/' + publicId;
}

// Build a Cloudinary srcset for a markdown image. Returns null for
// non-Cloudinary URLs (so the figure falls back to a plain <img src>) and
// for animated GIFs — Cloudinary's free/standard plans cap animated
// transforms at 50 MP across all frames, so any per-width resize on a long
// GIF returns 400. We deliver animated GIFs at original dimensions instead;
// `f_auto` alone still converts to animated WebP/AVIF (~60% smaller) which
// is enough.
function buildCloudinarySrcset(src) {
  if (!CLOUDINARY_IMAGE_RE.test(src)) return null;
  if (/\.gif$/i.test(src)) return null;
  return IMAGE_SRCSET_WIDTHS
    .map((w) => `${optimizeCloudinaryUrl(src, false, w)} ${w}w`)
    .join(', ');
}

// Detects an authored 1:1 aspect intent in the Cloudinary URL — either
// `ar_1.0` (decimal) or `ar_1:1` (ratio). When set, the figure cell takes
// `aspect-ratio: 1/1` and the inner img/video uses `object-fit: cover` so
// the cell fills cleanly even if the source is delivered at its natural
// aspect (e.g. a paired GIF that can't be transformed via Cloudinary).
function hasOneToOneAspect(src) {
  return /\bar_1(?:\.0|:1)\b/.test(src);
}

// Returns { figure, captionText } — caption is placed in the page margin, not inside figure.
function buildFigure(img, { isPair = false } = {}) {
  const src = img.properties?.src ?? '';
  const alt = img.properties?.alt ?? '';
  const isVideo = VIDEO_EXT.test(src);
  const isOneToOne = hasOneToOneAspect(src);

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
    const isGif = /\.gif$/i.test(src);
    const srcset = buildCloudinarySrcset(src);
    // Animated GIFs can't be resized via Cloudinary (50 MP cap), so emit a
    // single src at original dimensions. f_auto alone still serves animated
    // WebP/AVIF when the browser supports it.
    const srcUrl = isGif
      ? optimizeCloudinaryUrl(src, false, null)
      : optimizeCloudinaryUrl(src, false, IMAGE_DEFAULT_WIDTH);
    mediaChild = {
      ...img,
      properties: {
        ...img.properties,
        src: srcUrl,
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
      properties: {
        className: ['media-full'],
        'data-aspect': isOneToOne ? '1:1' : undefined,
      },
      children: [mediaChild],
    },
    captionText: captionText || null,
    isOneToOne,
  };
}

// In a pair, if either cell carries an authored 1:1 intent we apply it to
// both so the cells match height (e.g. one image cropped via Cloudinary
// `ar_1.0` paired with a GIF Cloudinary can't transform).
function harmoniseAspect(left, right) {
  if (!(left.isOneToOne || right.isOneToOne)) return;
  left.figure.properties['data-aspect'] = '1:1';
  right.figure.properties['data-aspect'] = '1:1';
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
              harmoniseAspect(left, right);
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
