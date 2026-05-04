/**
 * Remark plugin — turns kicker + heading pairs into structural markup.
 *
 * Authoring contract:
 *   _Kicker_              ← italic-only paragraph
 *   ## Heading text       ← h2 → top-level section (kicker becomes the
 *                            <section id> too, so the side-nav can link
 *                            to it)
 *
 *   …content…
 *
 *   _Sub kicker_
 *   ### Sub heading       ← h3 → emitted inline as <p class="kicker"> +
 *                            <h3> within the parent section's content
 *
 * Sub-sections are NOT nav targets; only top-level h2 sections appear in
 * the side index (see parseSectionIndex in [slug].astro).
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

function makeKickerParagraph(text) {
  return {
    type: 'paragraph',
    data: { hProperties: { className: ['kicker'] } },
    children: [{ type: 'text', value: text }],
  };
}

export default function remarkProjectSections() {
  return (tree) => {
    const children = tree.children;
    const out = [];

    // Top-level (h2) sections accumulate into `currentTop`. h3 sub-sections
    // render inline within the current top's children — no wrapper.
    let currentTop = null;

    const flushTop = () => {
      if (!currentTop) return;
      out.push(currentTop);
      currentTop = null;
    };

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      const next = children[i + 1];
      const kicker = emphasisOnlyParagraph(node);

      // Kicker + h2 → start a new top-level section.
      if (kicker && next?.type === 'heading' && next.depth === 2) {
        flushTop();
        currentTop = {
          type: 'projectSection',
          data: { hName: 'section', hProperties: { id: slug(kicker) } },
          children: [makeKickerParagraph(kicker), next],
        };
        i++;
        continue;
      }

      // Kicker + h3 → inline kicker paragraph + heading inside the current
      // section. Outside a top-level section, this still produces the right
      // markup at the document root.
      if (kicker && next?.type === 'heading' && next.depth === 3) {
        const target = currentTop ? currentTop.children : out;
        target.push(makeKickerParagraph(kicker));
        target.push(next);
        i++;
        continue;
      }

      // Plain content — route into the open section if any.
      if (currentTop) {
        currentTop.children.push(node);
      } else {
        out.push(node);
      }
    }
    flushTop();
    tree.children = out;
  };
}
