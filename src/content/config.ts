import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    client: z.string(),
    summary: z.string(),
    metaDescription: z.string(),
    thumbnailImage: z.string(),
    order: z.number(),
    published: z.boolean().optional(),
  }),
});

export const collections = {
  projects,
};

