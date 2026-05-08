/**
 * Remark plugin — resolve relative body asset references to full
 * Cloudinary URLs using the entry's `mediaBase` / `mediaVersion`
 * frontmatter.
 *
 * Runs at the mdast stage, before Astro's content-assets vite plugin
 * tries to ESM-import the image src. By the time content-assets sees
 * the src it's a full Cloudinary URL and gets passed through unchanged.
 *
 * Site-rooted paths (`/placeholder.svg`) and full URLs are left alone.
 *
 * Authoring shape: `![alt](filename.ext "caption")` in markdown body,
 * with `mediaBase: alan.design/Project` (and optional `mediaVersion`)
 * in frontmatter. See src/lib/cloudinary.mjs for the URL builder.
 */
import { visit } from 'unist-util-visit';
import { resolveBodyMediaUrl } from '../lib/cloudinary.mjs';

export default function remarkResolveMedia() {
  return (tree, file) => {
    const frontmatter = file?.data?.astro?.frontmatter ?? {};
    visit(tree, 'image', (node) => {
      const resolved = resolveBodyMediaUrl(node.url, frontmatter);
      if (resolved !== node.url) node.url = resolved;
    });
  };
}
