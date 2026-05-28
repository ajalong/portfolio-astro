import { visit } from 'unist-util-visit';

export default function rehypeExternalLinks() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (
        node.tagName === 'a' &&
        node.properties?.href &&
        /^https?:\/\//.test(String(node.properties.href))
      ) {
        node.properties.target = '_blank';
        node.properties.rel = 'noopener noreferrer';
        // Warn assistive-tech users that the link opens a new tab. Appended
        // as a visually-hidden span so it joins the link's accessible name
        // without changing the visible text.
        node.children.push({
          type: 'element',
          tagName: 'span',
          properties: { className: ['sr-only'] },
          children: [{ type: 'text', value: ' (opens in new tab)' }],
        });
      }
    });
  };
}
