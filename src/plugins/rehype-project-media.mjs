/**
 * Rehype plugin for project markdown:
 * 1. Ensure Cloudinary image URLs include f_auto, q_auto, and a width cap.
 * 2. Wrap markdown images in <figure class="media-full"> with <figcaption> from alt.
 * 3. If src is a video (.mp4, .webm, .mov), render <video> instead of <img>.
 * 4. Consecutive runs of media figures:
 *    - 1 figure: full width only.
 *    - 2 figures: one row, two columns (media-half).
 *    - 3+ figures: first full width, then remaining in one row (2–5 columns as media-half, media-thirds, media-four, media-five).
 */
import { visit } from 'unist-util-visit';

const VIDEO_EXT = /\.(mp4|webm|mov)(\?.*)?$/i;
const CLOUDINARY_IMAGE_RE = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;
const CLOUDINARY_VIDEO_RE = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//;

/**
 * Ensure a Cloudinary delivery URL includes baseline optimization params.
 * Injects f_auto, q_auto, and c_limit,w_1400 (images only) when missing.
 * Preserves any existing transformations the author already specified.
 */
function optimizeCloudinaryUrl(src, isVideo) {
  const re = isVideo ? CLOUDINARY_VIDEO_RE : CLOUDINARY_IMAGE_RE;
  if (!re.test(src)) return src;

  const prefix = src.match(re)[0];
  const rest = src.slice(prefix.length);

  const parts = rest.split('/');
  const transformSegments = [];
  let publicIdStart = 0;

  for (let i = 0; i < parts.length; i++) {
    if (/^[a-z][a-z0-9]*_/i.test(parts[i]) || parts[i].startsWith('v') && /^v\d+$/.test(parts[i])) {
      transformSegments.push(parts[i]);
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

function isMediaFigure(node) {
  return node.type === 'element' && node.tagName === 'figure' && Array.isArray(node.properties?.className) && node.properties.className.includes('media-full');
}

function isWhitespaceText(node) {
  return node && node.type === 'text' && /^\s*$/.test(node.value || '');
}

const ROW_CLASSES = ['media-half', 'media-thirds', 'media-four', 'media-five'];

function wrapInSection(figures, sectionClass) {
  return {
    type: 'element',
    tagName: 'section',
    properties: { className: [sectionClass] },
    children: figures.map((fig) => ({
      type: 'element',
      tagName: 'div',
      properties: {},
      children: [fig],
    })),
  };
}

function rehypeProjectMedia() {
  return (tree) => {
    // Pass 0: inject Cloudinary optimization params into any img/video src that's missing them.
    visit(tree, 'element', (node) => {
      if (node.tagName === 'img' && node.properties?.src) {
        node.properties.src = optimizeCloudinaryUrl(node.properties.src, false);
      }
      if (node.tagName === 'video' && node.properties?.src) {
        node.properties.src = optimizeCloudinaryUrl(node.properties.src, true);
      }
    });

    // Pass 1: transform paragraphs that only contain images into media figures/sections.
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'p') return;
      const elementChildren = node.children?.filter((c) => c.type === 'element') || [];
      if (!elementChildren.length) return;

      const hasOnlyImages = elementChildren.every((c) => c.tagName === 'img');
      const nonWhitespaceText = (node.children || []).some(
        (c) => c.type === 'text' && !/^\s*$/.test(c.value || ''),
      );
      if (!hasOnlyImages || nonWhitespaceText) return;

      const figures = elementChildren.map((img) => {
        const src = (img.properties?.src ?? '') || '';
        const alt = (img.properties?.alt ?? '') || '';
        const isVideo = VIDEO_EXT.test(src);

        const figureChildren = [];
        if (isVideo) {
          figureChildren.push({
            type: 'element',
            tagName: 'video',
            properties: { src, autoplay: true, loop: true, muted: true, playsInline: true },
            children: [],
          });
        } else {
          figureChildren.push({
            ...img,
            properties: { ...img.properties, draggable: false },
          });
        }
        if (alt) {
          figureChildren.push({
            type: 'element',
            tagName: 'figcaption',
            children: [{ type: 'text', value: alt }],
          });
        }

        return {
          type: 'element',
          tagName: 'figure',
          properties: { className: ['media-full'] },
          children: figureChildren,
        };
      });

      // Replace the <p> itself.
      if (figures.length === 1) {
        const fig = figures[0];
        node.tagName = fig.tagName;
        node.properties = fig.properties;
        node.children = fig.children;
      } else {
        const sectionClass =
          ROW_CLASSES[Math.min(figures.length - 1, ROW_CLASSES.length - 1)] || 'media-half';
        node.tagName = 'section';
        node.properties = { className: [sectionClass] };
        node.children = figures.map((fig) => ({
          type: 'element',
          tagName: 'div',
          properties: {},
          children: [fig],
        }));
      }
    });

    // Pass 2: group consecutive media figures into runs, then layout by run length.
    // Whitespace-only text nodes between figures are ignored for grouping.
    visit(tree, 'element', (node) => {
      if (!node.children || !Array.isArray(node.children)) return;
      const children = node.children;
      const next = [];
      let i = 0;
      while (i < children.length) {
        if (!isMediaFigure(children[i]) && !isWhitespaceText(children[i])) {
          next.push(children[i]);
          i += 1;
          continue;
        }

        // Skip leading whitespace before a run.
        while (i < children.length && isWhitespaceText(children[i])) {
          i += 1;
        }

        const run = [];
        while (i < children.length && (isMediaFigure(children[i]) || isWhitespaceText(children[i]))) {
          if (isMediaFigure(children[i])) {
            run.push(children[i]);
          }
          i += 1;
        }

        if (!run.length) {
          continue;
        }

        if (run.length === 1) {
          next.push(run[0]);
        } else if (run.length === 2) {
          next.push(wrapInSection(run, 'media-half'));
        } else {
          next.push(run[0]);
          const rest = run.slice(1);
          const sectionClass = ROW_CLASSES[Math.min(rest.length - 1, ROW_CLASSES.length - 1)];
          next.push(wrapInSection(rest, sectionClass));
        }
      }
      node.children = next;
    });
  };
}

export default rehypeProjectMedia;
