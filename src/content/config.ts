import { defineCollection, z } from 'astro:content';

/** Case-study credits: first person is shown as lead (optional multiline description). `headshot` must be a direct image URL (e.g. LinkedIn CDN URL from “Copy image address”, or Cloudinary). */
const projectTeamMemberSchema = z.object({
  name: z.string(),
  role: z.string(),
  company: z.string().optional(),
  headshot: z.string().optional(),
  description: z.string().optional(),
  linkedin: z.string().url().optional(),
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
    year: z.number().optional(),
    sector: z.string().optional(),
    team: z.array(projectTeamMemberSchema).optional(),
  }),
});

export const collections = {
  projects,
};

