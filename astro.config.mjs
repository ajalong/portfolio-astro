// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeProjectMedia from './src/plugins/rehype-project-media.mjs';
import rehypeExternalLinks from './src/plugins/rehype-external-links.mjs';
import remarkProjectSections from './src/plugins/remark-project-sections.mjs';
import remarkBlockquoteCite from './src/plugins/remark-blockquote-cite.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://alanlong.design',
  integrations: [sitemap()],
  // Force CSS into external <link> stylesheets instead of inline <style>.
  // Astro's `auto` heuristic was inlining the full ~95 KB bundle per route,
  // which Microsoft Clarity's session replay (rrweb) would silently drop —
  // captured sessions appeared as unstyled HTML. External <link> sheets are
  // captured reliably. The trade is one extra render-blocking request and a
  // small first-paint regression; second-page navigations benefit from the
  // CSS now being browser-cached. If Clarity still mis-captures, escalate
  // by adding CORS headers on /_astro/*.css and a crossorigin="anonymous"
  // attribute on the generated <link> tags.
  build: {
    inlineStylesheets: 'never',
  },
  redirects: {
    '/project/atikinsrealis': '/project/atkinsrealis',
  },
  markdown: {
    remarkPlugins: [remarkBlockquoteCite, remarkProjectSections],
    rehypePlugins: [rehypeExternalLinks, rehypeProjectMedia],
  },
});
