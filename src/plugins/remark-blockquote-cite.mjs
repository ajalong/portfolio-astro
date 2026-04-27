/**
 * Remark plugin — extracts an em-dash attribution line in a blockquote into <cite>.
 *
 * Authoring contract:
 *   > "Quote text..."
 *   >
 *   > — Author name, role
 *
 * The trailing paragraph that begins with `— ` (em-dash + space) is converted
 * into a <cite> rendered inside the same <blockquote>. Default blockquote
 * styling in _base.scss already handles the rest, so authors can drop the
 * explicit `<blockquote class="quote-standard">` + `<cite>` HTML wrappers.
 */
import { visit } from 'unist-util-visit';

const DASH_PREFIX = /^—\s+(.+)$/s;

export default function remarkBlockquoteCite() {
  return (tree) => {
    visit(tree, 'blockquote', (node) => {
      const last = node.children[node.children.length - 1];
      if (!last || last.type !== 'paragraph') return;
      const first = last.children[0];
      if (!first || first.type !== 'text') return;
      const m = first.value.match(DASH_PREFIX);
      if (!m) return;
      first.value = m[1];
      last.data = { ...(last.data ?? {}), hName: 'cite', hProperties: {} };
    });
  };
}
