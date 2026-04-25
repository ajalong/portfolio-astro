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
 *   - .mp4 / .webm / .mov sources render as autoplaying <video> instead of <img>.
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

function optimizeCloudinaryUrl(src, isVideo) {
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

  const existingParams = transformSegments.join(',');
  const publicId = parts.slice(publicIdStart).join('/');
  const isGif = /\.gif$/i.test(publicId);

  const missing = [];
  if (!/\bf_auto\b/.test(existingParams)) missing.push('f_auto');
  if (!/\bq_auto\b/.test(existingParams)) missing.push('q_auto:best');
  // Animated GIFs need fl_animated so Cloudinary preserves animation when
  // converting to WebP/AVIF via f_auto.
  if (isGif && !/\bfl_animated\b/.test(existingParams)) missing.push('fl_animated');
  if (!isVideo && !/\b[wc]_\d/.test(existingParams)) missing.push('c_limit', 'w_1800');

  if (!missing.length) return src;

  const allTransforms = [...transformSegments, ...missing].filter(Boolean);
  return prefix + allTransforms.join(',') + '/' + publicId;
}

// Returns { figure, captionText } — caption is placed in the page margin, not inside figure.
function buildFigure(img) {
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
        src: optimizeCloudinaryUrl(src, true),
        autoplay: true,
        loop: true,
        muted: true,
        playsInline: true,
        'aria-label': altText || undefined,
      },
      children: [],
    };
  } else {
    mediaChild = {
      ...img,
      properties: {
        ...img.properties,
        src: optimizeCloudinaryUrl(src, false),
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
          const { figure, captionText } = buildFigure(imgs[0]);
          const captions = captionText ? [makeCaptionEl(captionText, 'right')] : [];
          next.push(makeMediaBlock([figure], captions, false));
        } else {
          // 2+ images in same paragraph → pairs; odd trailing → full-width.
          for (let k = 0; k < imgs.length; k += 2) {
            const left = buildFigure(imgs[k]);
            const rightImg = imgs[k + 1];
            if (!rightImg) {
              const captions = left.captionText ? [makeCaptionEl(left.captionText, 'right')] : [];
              next.push(makeMediaBlock([left.figure], captions, false));
            } else {
              const right = buildFigure(rightImg);
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
