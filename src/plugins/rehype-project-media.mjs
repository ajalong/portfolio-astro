/**
 * Rehype plugin for project markdown.
 *
 * Authoring contract:
 *   - A single markdown image on its own becomes a full-width figure (cols 2–7).
 *   - Two consecutive markdown images (no blank line between) become a side-by-side
 *     pair: left image in cols 2–4, right in cols 5–7.
 *   - Alt text and caption are independent. Authoring shape:
 *       ![alt for screen readers](filename.ext "visible caption")
 *     The bracketed text is the alt; the quoted markdown title attribute is
 *     the caption shown in the page margin (col 8 / col 1 for pair).
 *     Legacy shape — `![Caption — Alt](url)` with em-dash separator — is
 *     still supported for back-compat.
 *   - .mp4 / .webm / .mov sources render as <video data-autoplay-on-view>
 *     (no native `autoplay` attribute — playback is JS-driven by
 *     `initMediaAutoplay` so off-screen videos never start) instead of <img>.
 *   - Body asset references can be relative filenames; the plugin resolves
 *     them against the entry's `mediaBase` / `mediaVersion` frontmatter
 *     (see src/lib/cloudinary.mjs). Full URLs pass through unchanged.
 *   - Cloudinary URLs (resolved or authored) are auto-optimised with
 *     f_auto, q_auto, c_limit/w_*, and (for video) vc_auto/fps_auto/ac_none.
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
import { resolveBodyMediaUrl } from '../lib/cloudinary.mjs';

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
  // `fl_animated` is for animated-image delivery (animated WebP / GIF). On
  // a video URL it forces Cloudinary into that mode — even with a smooth
  // WebM source, output ends up at GIF-rate playback. Strip it for video
  // URLs so the source's true frame rate survives transcoding.
  if (isVideo) {
    for (const seg of segs) {
      if (seg.kind !== 'transform') continue;
      seg.params = seg.params.filter((p) => p !== 'fl_animated');
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
  // Video-only optimisations: best-codec-within-format selection and
  // full audio-track strip (every video on the site is silent UI
  // motion). Each one skips if an explicit override is already present
  // in the URL.
  // (fps_auto omitted — requires the Cloudinary FFmpeg add-on which
  // isn't enabled on this account; URL returns 400 when included.)
  if (isVideo) {
    if (!/\bvc_/.test(allParamsString)) additions.push('vc_auto');
    if (!/\bac_/.test(allParamsString)) additions.push('ac_none');
  }
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
function buildFigure(img, { isPair = false, isFirst = false, frontmatter = {} } = {}) {
  const rawSrc = img.properties?.src ?? '';
  // Resolve relative filenames against the entry's mediaBase before any
  // type / Cloudinary checks — full URLs and site-rooted paths pass through.
  const src = resolveBodyMediaUrl(rawSrc, frontmatter);
  const alt = img.properties?.alt ?? '';
  const title = img.properties?.title ?? '';
  const isVideo = VIDEO_EXT.test(src);
  const isOneToOne = hasOneToOneAspect(src);

  // Caption / alt resolution:
  //   1. Markdown title attribute (`![alt](url "caption")`) — preferred.
  //      Caption is whatever's quoted; alt stays as bracketed text.
  //   2. Legacy em-dash separator — `![Caption — Alt description](url)` —
  //      split into caption (before) and alt (after). Kept for back-compat
  //      on entries not yet migrated.
  //   3. Plain alt with no title and no separator — alt doubles as the
  //      caption. Preserves the visible-margin caption that older entries
  //      relied on.
  let captionText;
  let altText;
  if (title) {
    captionText = title;
    altText = alt;
  } else {
    const separatorIdx = alt.indexOf(' — ');
    if (separatorIdx !== -1) {
      captionText = alt.slice(0, separatorIdx);
      altText = alt.slice(separatorIdx + 3);
    } else {
      captionText = alt;
      altText = alt;
    }
  }

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
        // Load just enough for first-frame paint and metadata; the full
        // file is fetched only once initMediaAutoplay calls play() on
        // intersect.
        preload: 'metadata',
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
        // Suppress the markdown title attribute on the rendered <img> —
        // we've already lifted it into the visible caption below the
        // figure, and leaving it on the element produces a duplicate
        // browser tooltip on hover.
        title: undefined,
        draggable: false,
        // Off-thread decode — frees the main thread during paint.
        decoding: 'async',
        // First figure is the LCP candidate on case-study pages: load
        // eagerly with high priority. Everything below the fold lazy-
        // loads to spare bandwidth until the user scrolls in.
        loading: isFirst ? 'eager' : 'lazy',
        fetchpriority: isFirst ? 'high' : undefined,
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
  return (tree, file) => {
    // Astro stashes the entry's frontmatter on the vfile under
    // `data.astro.frontmatter`. Used here for `mediaBase` / `mediaVersion`
    // resolution of relative body asset references.
    const frontmatter = file?.data?.astro?.frontmatter ?? {};

    // Tracks the first image figure across the whole document so we can
    // hint it as the LCP candidate (loading="eager", fetchpriority="high").
    // Videos don't get this — body videos lazy-paint via preload="metadata"
    // and only LCP in rare cases.
    let imageFigureCount = 0;
    const claimFirstImage = (src) => {
      if (VIDEO_EXT.test(src)) return false;
      if (imageFigureCount > 0) return false;
      imageFigureCount++;
      return true;
    };

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
          const isFirst = claimFirstImage(imgs[0].properties?.src ?? '');
          const { figure, captionText } = buildFigure(imgs[0], { isPair: false, isFirst, frontmatter });
          const captions = captionText ? [makeCaptionEl(captionText, 'right')] : [];
          next.push(makeMediaBlock([figure], captions, false));
        } else {
          // 2+ images in same paragraph → pairs; odd trailing → full-width.
          for (let k = 0; k < imgs.length; k += 2) {
            const rightImg = imgs[k + 1];
            const isPair = !!rightImg;
            const leftFirst = claimFirstImage(imgs[k].properties?.src ?? '');
            const left = buildFigure(imgs[k], { isPair, isFirst: leftFirst, frontmatter });
            if (!rightImg) {
              const captions = left.captionText ? [makeCaptionEl(left.captionText, 'right')] : [];
              next.push(makeMediaBlock([left.figure], captions, false));
            } else {
              const right = buildFigure(rightImg, { isPair: true, isFirst: false, frontmatter });
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
