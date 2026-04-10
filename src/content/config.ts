import { defineCollection, z } from 'astro:content';

/** Case-study credits: first person is shown as lead (optional multiline description). `headshot` must be a direct image URL (e.g. LinkedIn CDN URL from “Copy image address”, or Cloudinary). */
const projectTeamMemberSchema = z.object({
  name: z.string(),
  role: z.string(),
  headshot: z.string(),
  description: z.string().optional(),
});

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
    team: z.array(projectTeamMemberSchema).optional(),
  }),
});

export const collections = {
  projects,
};

