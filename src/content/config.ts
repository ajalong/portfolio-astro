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
    // Cloudinary base path the rehype plugin prepends to every relative
    // body asset reference (e.g. `mediaBase: alan.design/WSJ` →
    // `[alt](welcome.mp4)` resolves to .../alan.design/WSJ/welcome.mp4).
    // Optional only because legacy entries still use full URLs in body.
    mediaBase: z.string().optional(),
    // Optional version pin (`v123456789`) inserted between transforms and
    // the public-id. Omit to always serve latest.
    mediaVersion: z.string().optional(),
    // Single Cloudinary public-id (no extension) for the project thumbnail.
    // The plugin builds both the .jpg poster (first-frame) and the .mp4
    // loop URLs from this with the thumbnail-context transform profile —
    // smaller width, eco quality, fade-in/out, audio stripped. Replaces
    // the manual thumbnailImage / thumbnailVideo URLs.
    thumbnail: z.string().optional(),
    // Legacy full-URL thumbnails. Either `thumbnail` (new) or
    // `thumbnailImage` (legacy) must be set. `thumbnailVideo` is optional
    // in both shapes (cards can fall back to the still poster).
    thumbnailImage: z.string().optional(),
    thumbnailVideo: z.string().optional(),
    order: z.number(),
    published: z.boolean().optional(),
    year: z.number().optional(),
    sector: z.string().optional(),
    // Heading text shown above the inline "My role" card. Defaults to
    // "Lead Product Designer" in the component when omitted.
    roleTitle: z.string().optional(),
    // Senior positioning statement shown in the inline "My role" card.
    // The lead member's `description` is rendered separately in the team
    // panel as a shorter scope-focused collaborator entry.
    roleSummary: z.string().optional(),
    team: z.array(projectTeamMemberSchema).optional(),
    // Two brand colours per project. They drive the animated background
    // gradient (see Background.astro / _background.scss) and are exposed
    // as :root CSS custom properties (`--brand-primary`, `--brand-secondary`)
    // so any element on the page can reference the active project's brand
    // palette via `var(--brand-primary)` etc.
    brand: z.object({
      primary: z.string(),
      secondary: z.string(),
    }).optional(),
  }),
});

export const collections = {
  projects,
};

