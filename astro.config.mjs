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
  redirects: {
    '/project/atikinsrealis': '/project/atkinsrealis',
  },
  markdown: {
    remarkPlugins: [remarkBlockquoteCite, remarkProjectSections],
    rehypePlugins: [rehypeExternalLinks, rehypeProjectMedia],
  },
});
