// @ts-check
import { defineConfig } from 'astro/config';
import rehypeProjectMedia from './src/plugins/rehype-project-media.mjs';
import rehypeExternalLinks from './src/plugins/rehype-external-links.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://alanlong.design',
  redirects: {
    '/project/atikinsrealis': '/project/atkinsrealis',
  },
  markdown: {
    rehypePlugins: [rehypeExternalLinks, rehypeProjectMedia],
  },
});
