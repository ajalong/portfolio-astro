/**
 * Remark plugin — extracts an em-dash attribution line from a blockquote into
 * a sibling <p class="quote-attr"> placed immediately after the blockquote.
 *
 * Authoring contract:
 *   > "Quote text..."
 *   >
 *   > — Author name, role
 *
 * The trailing paragraph that begins with `— ` (em-dash + space) is removed
 * from the blockquote and re-emitted as a standalone paragraph after it so
 * the attribution sits below the left border rather than inside it.
 */
import { visit, SKIP } from 'unist-util-visit';

const DASH_PREFIX = /^—\s+(.+)$/s;

export default function remarkBlockquoteCite() {
  return (tree) => {
    visit(tree, 'blockquote', (node, index, parent) => {
      if (!parent) return;
      const last = node.children[node.children.length - 1];
      if (!last || last.type !== 'paragraph') return;
      const first = last.children[0];
      if (!first || first.type !== 'text') return;
      const m = first.value.match(DASH_PREFIX);
      if (!m) return;

      // Strip the em-dash prefix and remove from blockquote.
      first.value = m[1];
      node.children.splice(node.children.length - 1, 1);

      // Emit as a sibling paragraph immediately after the blockquote.
      last.data = { ...(last.data ?? {}), hName: 'p', hProperties: { className: ['quote-attr'] } };
      parent.children.splice(index + 1, 0, last);

      return SKIP;
    });
  };
}
