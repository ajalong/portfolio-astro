/**
 * Rehype plugin for project markdown:
 * 1. Ensure Cloudinary image/video URLs include f_auto, q_auto, and a width cap.
 * 2. Wrap markdown images in <figure class="media-full"> with <figcaption> from alt.
 * 3. If src is a video (.mp4, .webm, .mov), render <video> instead of <img>.
 * 4. Two consecutive media figures are wrapped in a <section class="media-half"> row.
 *    A single figure remains full-width. More than two is not supported.
 */
import { visit } from 'unist-util-visit';

const VIDEO_EXT = /\.(mp4|webm|mov)(\?.*)?$/i;
const CLOUDINARY_IMAGE_RE = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;
const CLOUDINARY_VIDEO_RE = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//;

// Known Cloudinary transformation prefixes — used to distinguish transform
// segments from the public ID. Listing known prefixes avoids false-matching
// public IDs that happen to contain an underscore.
const CLOUDINARY_TRANSFORM_PREFIX = /^(?:a|ar|b|bo|c|co|dpr|e|f|fl|g|h|l|o|q|r|t|u|w|x|y|z)_/;

/**
 * Ensure a Cloudinary delivery URL includes baseline optimisation params.
 * Injects f_auto, q_auto:best, and (images only) c_limit,w_1800 when missing.
 * Preserves any existing transformations the author already specified.
 */
function optimizeCloudinaryUrl(src, isVideo) {
  const re = isVideo ? CLOUDINARY_VIDEO_RE : CLOUDINARY_IMAGE_RE;
  if (!re.test(src)) return src;

  const prefix = src.match(re)[0];
  const rest = src.slice(prefix.length);
  const parts = rest.split('/');

  // Collect leading transform segments and version string (v123456).
  // Stop as soon as we hit a segment that doesn't look like a known transform.
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
  const missing = [];
  if (!/\bf_auto\b/.test(existingParams)) missing.push('f_auto');
  if (!/\bq_auto\b/.test(existingParams)) missing.push('q_auto:best');
  if (!isVideo && !/\b[wc]_\d/.test(existingParams)) missing.push('c_limit', 'w_1800');

  if (!missing.length) return src;

  const publicId = parts.slice(publicIdStart).join('/');
  const allTransforms = [...transformSegments, ...missing].filter(Boolean);
  return prefix + allTransforms.join(',') + '/' + publicId;
}

function buildMediaFigure(img) {
  const src = img.properties?.src ?? '';
  const alt = img.properties?.alt ?? '';
  const isVideo = VIDEO_EXT.test(src);

  // Split "Caption — Detailed screen-reader description" on em dash.
  // Caption goes in <figcaption> (visible); description goes in alt/aria-label.
  const separatorIdx = alt.indexOf(' — ');
  const caption = separatorIdx !== -1 ? alt.slice(0, separatorIdx) : alt;
  const altText = separatorIdx !== -1 ? alt.slice(separatorIdx + 3) : alt;

  const figureChildren = [];

  if (isVideo) {
    figureChildren.push({
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
    });
  } else {
    figureChildren.push({
      ...img,
      properties: {
        ...img.properties,
        src: optimizeCloudinaryUrl(src, false),
        alt: altText,
        draggable: false,
      },
    });
  }

  if (caption) {
    figureChildren.push({
      type: 'element',
      tagName: 'figcaption',
      children: [{ type: 'text', value: caption }],
    });
  }

  return {
    type: 'element',
    tagName: 'figure',
    properties: { className: ['media-full'] },
    children: figureChildren,
  };
}

function isMediaFigure(node) {
  return (
    node.type === 'element' &&
    node.tagName === 'figure' &&
    Array.isArray(node.properties?.className) &&
    node.properties.className.includes('media-full')
  );
}

function isWhitespace(node) {
  return node.type === 'text' && /^\s*$/.test(node.value ?? '');
}

export default function rehypeProjectMedia() {
  return (tree) => {
    // Pass 1: transform image-only <p> nodes into media figures.
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'p') return;

      const elementChildren = (node.children ?? []).filter((c) => c.type === 'element');
      if (!elementChildren.length) return;
      if (!elementChildren.every((c) => c.tagName === 'img')) return;
      if ((node.children ?? []).some((c) => c.type === 'text' && !/^\s*$/.test(c.value ?? ''))) return;

      const figures = elementChildren.map(buildMediaFigure);

      if (figures.length === 1) {
        Object.assign(node, figures[0]);
      } else {
        // Two images: side-by-side columns. More than two is not supported.
        node.tagName = 'section';
        node.properties = { className: ['media-half'] };
        node.children = figures.map((fig) => ({
          type: 'element',
          tagName: 'div',
          properties: {},
          children: [fig],
        }));
      }
    });

    // Pass 2: group pairs of consecutive sibling figures into media-half rows.
    // This handles the case where two separate single-image paragraphs sit
    // adjacent in the markdown (each becomes a figure after Pass 1).
    visit(tree, 'element', (node) => {
      if (!Array.isArray(node.children)) return;

      const next = [];
      let i = 0;

      while (i < node.children.length) {
        const child = node.children[i];

        if (!isMediaFigure(child) && !isWhitespace(child)) {
          next.push(child);
          i++;
          continue;
        }

        // Skip leading whitespace.
        while (i < node.children.length && isWhitespace(node.children[i])) i++;

        // Collect a run of consecutive figures (ignoring whitespace between them).
        const run = [];
        while (i < node.children.length) {
          if (isMediaFigure(node.children[i])) {
            run.push(node.children[i]);
            i++;
          } else if (isWhitespace(node.children[i])) {
            i++;
          } else {
            break;
          }
        }

        if (!run.length) continue;

        if (run.length === 1) {
          next.push(run[0]);
        } else {
          // Two figures: side-by-side. Emit as media-half, then continue with
          // any remainder as individual full-width figures.
          next.push({
            type: 'element',
            tagName: 'section',
            properties: { className: ['media-half'] },
            children: run.slice(0, 2).map((fig) => ({
              type: 'element',
              tagName: 'div',
              properties: {},
              children: [fig],
            })),
          });
          // Any figures beyond the first two get emitted individually.
          for (let j = 2; j < run.length; j++) {
            next.push(run[j]);
          }
        }
      }

      node.children = next;
    });
  };
}
