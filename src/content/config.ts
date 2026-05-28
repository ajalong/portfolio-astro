import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** Case-study credits: first person is shown as lead (optional multiline description). `headshot` must be a direct image URL (e.g. LinkedIn CDN URL from “Copy image address”, or Cloudinary). */
const projectTeamMemberSchema = z.object({
  name: z.string(),
  role: z.string(),
  company: z.string().optional(),
  headshot: z.string().optional(),
  description: z.string().optional(),
  linkedin: z.string().url().optional(),
});

/** Organisation/company credit shown in the top-right sidebar cluster — client, employer, partner agencies. Same authoring shape as `team` members but for orgs. `logo` is a direct image URL. `url` makes the card clickable and links to the org's website (opens in a new tab). */
const projectOrgSchema = z.object({
  name: z.string(),
  caption: z.string(),
  logo: z.string().optional(),
  url: z.string().url().optional(),
});

/** Headline metric for a project — big value + supporting label + optional
 *  longer description. Authored once in frontmatter and consumed by both
 *  the project page's Impact section (iterated into MetricCards) AND the
 *  homepage showcase (first 3 entries become the bottom-left cards). Keep
 *  the array authored in display order — the showcase pulls indices 0/1/2
 *  into the big-left / mid-top / mid-bottom slots respectively. */
const projectImpactMetricSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string().optional(),
});

/** Single showcase image or video — `src` is a public-id relative to the
 *  project's `mediaBase` (extension included, e.g. `transparent/foo.png`
 *  for images, `lobby.mp4` for videos); the URL is built via the matching
 *  `buildShowcase…Url` helper in cloudinary.mjs.
 *
 *  `objectPositionY` is an optional vertical anchor for `object-fit: cover`
 *  cropping (e.g. `"50%"`, `"20%"`, `"top"`). When provided, the showcase
 *  media element gets an inline `object-position: center <value>;`. Defaults
 *  to the CSS rule `top center` so the meaningful top of an asset stays
 *  visible — only set per-slot when an asset wants a different crop. */
const projectShowcaseImageSchema = z.object({
  src: z.string(),
  alt: z.string(),
  objectPositionY: z.string().optional(),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    client: z.string(),
    summary: z.string(),
    metaDescription: z.string(),
    slug: z.string().optional(),
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
    // Header kickers rendered beneath the page title. `industry` is the
    // client's market (e.g. "Pharma", "Fintech"); `theme` is the discipline
    // or shape of the work (e.g. "Design System", "UX Overhaul"). Both are
    // optional — when present they appear as small accent labels below the h1.
    industry: z.string().optional(),
    theme: z.string().optional(),
    // Heading text shown above the inline "My role" card. Defaults to
    // "Lead Product Designer" in the component when omitted.
    roleTitle: z.string().optional(),
    // Senior positioning statement shown in the inline "My role" card.
    // The lead member's `description` is rendered separately in the team
    // panel as a shorter scope-focused collaborator entry.
    roleSummary: z.string().optional(),
    team: z.array(projectTeamMemberSchema).optional(),
    orgs: z.array(projectOrgSchema).optional(),
    impactMetrics: z.array(projectImpactMetricSchema).optional(),
    // Two image slots on the homepage showcase — top-right (16:9 card)
    // and bottom-right (square card). Both optional; the slot renders as
    // an empty placeholder when not set.
    showcaseMedia: z.object({
      topRight: projectShowcaseImageSchema.optional(),
      bottomRight: projectShowcaseImageSchema.optional(),
    }).optional(),
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

