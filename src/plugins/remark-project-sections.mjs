/**
 * Remark plugin — turns kicker + heading pairs into <section> wrappers.
 *
 * Authoring contract:
 *   _Kicker_              ← italic-only paragraph
 *   ## Heading text       ← h2 → top-level section
 *
 *   …content…
 *
 *   _Sub kicker_
 *   ### Sub heading       ← h3 between two h2s → nested under the preceding h2
 *
 * Emits:
 *   <section id="kicker-slug">
 *     <p class="kicker">Kicker</p>
 *     <h2>Heading text</h2>
 *     …content…
 *   </section>
 *
 *   …and h3 sections gain `data-parent="<parent-h2-id>"` so the section index
 *   can render them nested.
 *
 * Section boundaries: a section consumes everything up to the next kicker +
 * heading pair (any depth). Content before the first kicker stays at the root
 * (e.g. an intro paragraph that doesn't belong to a section).
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

export default function remarkProjectSections() {
  return (tree) => {
    const children = tree.children;
    const out = [];
    let current = null;
    let currentTopId = null;

    const flush = () => {
      if (current) {
        out.push(current);
        current = null;
      }
    };

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      const next = children[i + 1];
      const kicker = emphasisOnlyParagraph(node);

      if (kicker && next?.type === 'heading' && (next.depth === 2 || next.depth === 3)) {
        const id = slug(kicker);
        const isNested = next.depth === 3 && currentTopId;
        const kickerNode = {
          type: 'paragraph',
          data: { hProperties: { className: ['kicker'] } },
          children: [{ type: 'text', value: kicker }],
        };
        const section = {
          type: 'projectSection',
          data: {
            hName: 'section',
            hProperties: {
              id,
              ...(isNested ? { 'data-parent': currentTopId } : {}),
            },
          },
          children: [kickerNode, next],
        };
        flush();
        current = section;
        if (next.depth === 2) currentTopId = id;
        i++; // skip heading; it's consumed into the section
        continue;
      }

      if (current) {
        current.children.push(node);
      } else {
        out.push(node);
      }
    }
    flush();
    tree.children = out;
  };
}
