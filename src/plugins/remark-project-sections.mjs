import { visit } from 'unist-util-visit';

/**
 * Remark plugin — turns kicker + heading pairs into structural markup.
 *
 * Authoring contract:
 *   _Kicker_              ← italic-only paragraph
 *   ## Heading text       ← h2 → top-level section
 *
 *   …content…
 *
 *   _Sub kicker_
 *   ### Sub heading       ← h3 between two h2s → sub-section
 *
 * Top-level (h2) sections render as inline <section> wrappers as before.
 * Sub-sections (h3) emit two pieces of markup:
 *   1. A <button> preview card placed inside the parent section's grid,
 *      showing the kicker, heading, and the first image found inside the
 *      sub-section's content (text-only if there's no image).
 *   2. A <dialog> placed as a sibling after the parent section, containing
 *      the full sub-section content. A click handler on the card calls
 *      dialog.showModal() so the content opens in a scrollable overlay.
 *
 * Sub-section dialogs do NOT appear in the section index; only top-level
 * h2 sections are nav targets. (See parseSectionIndex in [slug].astro.)
 */

function slug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[''']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function emphasisOnlyParagraph(node) {
  if (!node || node.type !== 'paragraph' || node.children.length !== 1) return null;
  const c = node.children[0];
  if (c.type !== 'emphasis' || c.children.length !== 1 || c.children[0].type !== 'text') {
    return null;
  }
  return c.children[0].value.trim();
}

// Find the first markdown `image` node anywhere in the given subtree
// (paragraphs, lists, etc.). Returns the node or null.
function findFirstImage(nodes) {
  for (const root of nodes) {
    let found = null;
    visit(root, 'image', (node) => {
      if (!found) found = node;
    });
    if (found) return found;
  }
  return null;
}

function buildPreviewImage(imageNode) {
  if (!imageNode) return null;
  return {
    type: 'previewImage',
    data: {
      hName: 'img',
      hProperties: {
        src: imageNode.url,
        alt: '',
        loading: 'lazy',
        decoding: 'async',
      },
    },
    children: [],
  };
}

function buildCloseButton() {
  return {
    type: 'subSectionModalClose',
    data: {
      hName: 'button',
      hProperties: {
        type: 'button',
        className: ['sub-section-modal__close'],
        'data-sub-section-modal-close': '',
        'aria-label': 'Close',
      },
    },
    children: [
      {
        type: 'modalCloseGlyph',
        data: { hName: 'span', hProperties: { 'aria-hidden': 'true' } },
        children: [{ type: 'text', value: '×' }],
      },
    ],
  };
}

export default function remarkProjectSections() {
  return (tree) => {
    const children = tree.children;
    const out = [];

    // State machine. Top-level (h2) sections accumulate into `currentTop`.
    // h3 sub-sections accumulate into `currentSub` while it's open; on
    // flush, the sub becomes a dialog appended after the parent section,
    // and a preview button card is inserted into the parent's grid.
    let currentTop = null;
    let currentTopId = null;
    let currentSub = null;       // dialog node accumulating content
    let currentSubButton = null; // matching preview button
    let pendingButtons = [];
    let pendingDialogs = [];

    const flushSub = () => {
      if (!currentSub) return;
      // The first image inside the sub-section content becomes the
      // preview thumbnail on the card. Walk the dialog's collected
      // content to find one; if none, the card stays text-only.
      const preview = buildPreviewImage(findFirstImage(currentSub.children));
      if (preview && currentSubButton) currentSubButton.children.push(preview);
      pendingDialogs.push(currentSub);
      currentSub = null;
      currentSubButton = null;
    };

    const flushTop = () => {
      flushSub();
      if (!currentTop) return;
      if (pendingButtons.length) {
        currentTop.children.push({
          type: 'subSectionGrid',
          data: { hName: 'div', hProperties: { className: ['sub-section-grid'] } },
          children: pendingButtons,
        });
      }
      out.push(currentTop);
      for (const d of pendingDialogs) out.push(d);
      currentTop = null;
      currentTopId = null;
      pendingButtons = [];
      pendingDialogs = [];
    };

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      const next = children[i + 1];
      const kicker = emphasisOnlyParagraph(node);

      // Kicker + h2 → start a new top-level section.
      if (kicker && next?.type === 'heading' && next.depth === 2) {
        flushTop();
        const id = slug(kicker);
        const kickerNode = {
          type: 'paragraph',
          data: { hProperties: { className: ['kicker'] } },
          children: [{ type: 'text', value: kicker }],
        };
        currentTop = {
          type: 'projectSection',
          data: { hName: 'section', hProperties: { id } },
          children: [kickerNode, next],
        };
        currentTopId = id;
        i++;
        continue;
      }

      // Kicker + h3 → start a sub-section card + dialog. Only meaningful
      // inside a top-level section; outside one, fall through to flat
      // content (rare in our templates but valid).
      if (kicker && next?.type === 'heading' && next.depth === 3 && currentTop) {
        flushSub();
        const id = slug(kicker);
        const kickerNode = {
          type: 'paragraph',
          data: { hProperties: { className: ['kicker'] } },
          children: [{ type: 'text', value: kicker }],
        };
        // Card needs its OWN copies of kicker + heading nodes so the
        // dialog can keep its originals. Cheap clones via spread; the
        // inner children are read-only references which is fine here.
        const kickerCopy = {
          type: 'paragraph',
          data: { hProperties: { className: ['kicker'] } },
          children: [{ type: 'text', value: kicker }],
        };
        const headingCopy = {
          type: 'heading',
          depth: next.depth,
          children: next.children.map((c) => ({ ...c })),
        };
        currentSubButton = {
          type: 'subSectionButton',
          data: {
            hName: 'button',
            hProperties: {
              type: 'button',
              className: ['sub-section-card'],
              'data-opens-modal': id,
              'aria-haspopup': 'dialog',
              'aria-controls': id,
            },
          },
          children: [kickerCopy, headingCopy],
        };
        pendingButtons.push(currentSubButton);

        currentSub = {
          type: 'subSectionDialog',
          data: {
            hName: 'dialog',
            hProperties: {
              id,
              className: ['sub-section-modal'],
              'data-sub-section-modal': '',
              'aria-label': kicker,
            },
          },
          children: [
            buildCloseButton(),
            {
              type: 'subSectionModalContent',
              data: { hName: 'div', hProperties: { className: ['sub-section-modal__content'] } },
              children: [kickerNode, next],
            },
          ],
        };
        i++;
        continue;
      }

      // Content node — route to the deepest open container.
      if (currentSub) {
        // Push into the dialog's content wrapper (last child of the dialog).
        const contentWrapper = currentSub.children[currentSub.children.length - 1];
        contentWrapper.children.push(node);
      } else if (currentTop) {
        currentTop.children.push(node);
      } else {
        out.push(node);
      }
    }
    flushTop();
    tree.children = out;
  };
}
