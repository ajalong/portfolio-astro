# Architecture & orientation — alanlong.design

A standing reference for how this site is built, so any session (Cowork or
Claude Code) can get oriented without re-reading the whole tree. Keep it
current: when a structural fact here goes stale, fix it in the same change
that made it stale.

This is the *what and where*. Working conventions and the multi-agent git
protocol live in `CLAUDE.md` — read that too.

---

## What it is

Alan Long's portfolio — a static personal site with a homepage and a set of
case-study (project) pages. Live at https://alanlong.design.

- **Framework:** Astro 5 (`astro@^5.17.1`), static output (SSG).
- **Content:** MDX case studies via `@astrojs/mdx`, plus `@astrojs/sitemap`.
- **Styling:** SCSS (`sass`), authored as `@use` partials.
- **Media:** Cloudinary (cloud name `ajalong`) for nearly all images/video.
- **Client JS:** small vanilla TS/JS modules — no UI framework. No React/Vue.
  (Earlier GSAP/Three.js deps were dropped.)
- **Analytics:** Microsoft Clarity (session replay), loaded on `window.load`.
- **Hosting:** Netlify (`npm run build` → `dist`), Node 20.
- **Repo:** `github.com/ajalong/portfolio-astro`. Default branch `main`;
  routine work on `staging` (see `CLAUDE.md`).

---

## Repo location on disk (important)

The live site lives in a repo that is checked out **more than once** under the
connected folder `~/Documents/Portfolio/alanlong.design/`:

- `alanlongdesign2021/astro-site/` → remote **portfolio-astro.git** — **the
  canonical working copy** for both agents. `git rev-parse --show-toplevel`
  resolves here. Specs go at `astro-site/.claude/specs/<slug>.md`.
- `portfolio-astro/` (top level) → a **second clone of the same remote**.
  Ignored, not deleted. Don't work here.
- `alanlongdesign2021/` (outer) → a **different** repo (remote
  `alanlongdesign2021`) holding the old static HTML site. Unrelated to Astro
  work; don't conflate.

---

## Build & run

```sh
npm install
npm run dev      # Astro dev server on localhost:4321
npm run build    # static build to ./dist
npm run preview  # preview the built site
```

A long-running dev server is usually already up — check before restarting
(the user is on a usage-limited plan).

`astro.config.mjs` sets `site`, registers the MDX + sitemap integrations, the
remark/rehype plugin pipeline (see below), a `/project/atikinsrealis` →
`/project/atkinsrealis` redirect, and **`build.inlineStylesheets: 'never'`**.
That last one is deliberate: Astro's default inlining of the ~95 KB CSS bundle
made Clarity's rrweb session replay capture pages as unstyled HTML; external
`<link>` sheets capture reliably. Don't switch it back to `auto` without
re-checking Clarity.

`netlify.toml` carries the build config, the same redirect, a stable-resume
redirect (`/Alan-Long-Resume-2026.pdf` → `/alanlong-resume.pdf`), and
site-wide security headers (HSTS, X-Frame-Options, etc.). CSP/Trusted-Types
are intentionally omitted (Astro + Clarity need inline scripts/styles).

---

## Directory map (`src/`)

- **`pages/`** — routes.
  - `index.astro` — homepage. Loads published projects, sorts by `order`,
    renders each as either a `ProjectShowcase` (rich) or a `ProjectCard`.
    Also: About header copy, `HomeSectionIndex`, the home `NavSd`, the
    `LogoCarousel`, and Person JSON-LD.
  - `project/[slug].astro` — case-study route. `getStaticPaths` builds one
    page per published project (slug = `data.slug ?? entry id`) and passes a
    `nextProject` (next by order, wrapping). Parses the body into a section
    index for the nav. Wraps content in `ProjectLayout`.
- **`layouts/`**
  - `BaseLayout.astro` — `<html>` shell: head/SEO (canonical, OpenGraph,
    Twitter, favicons), optional JSON-LD, `ClientRouter` (view transitions),
    Clarity loader, the `Background` + `ProgressiveBlur` chrome, the skip
    link, and the global client scripts (thumbnail hover, media autoplay,
    page-wipe). Accepts `brandPrimary`/`brandSecondary` and writes them as
    `--brand-primary`/`--brand-secondary` on `<body>`.
  - `ProjectLayout.astro` — case-study scaffold: title + kicker header,
    `NavLg`/`NavSd` (when a section index exists), the `ProjectTeamPanel`
    ("My role" + team + orgs), the MDX `<slot/>`, the "Next project" footer
    (renders `ProjectShowcase` or `ProjectCard`), the media lightbox
    `<dialog>`, and CreativeWork + BreadcrumbList JSON-LD.
- **`components/`** — `.astro` components, no framework runtime.
  - Top level: `Background`, `ProgressiveBlur`, `LogoCarousel`,
    `HomeSectionIndex`, `NavLg`, `NavSd`, `ProjectNavbar`, `ProjectCard`,
    `ProjectShowcase`, `ProjectTeamPanel`, `SourceNote`.
  - `cards/` — the MDX building blocks: `Card`, `CardGroup`, `MediaGroup`,
    `MetricCard`, `OrgCard`, `TestimonialCard`.
  - `icons/` — inline SVG icon components (arrows, chevrons).
- **`content/`** — the projects collection.
  - `config.ts` — Zod schema for project frontmatter (the data contract;
    detailed below). Uses the `glob` loader over `content/projects/**`.
  - `projects/*.mdx` — one case study per file: `atkinsrealis`, `gsk`,
    `mercedes`, `tradu`, `wsj`.
- **`lib/cloudinary.mjs`** — builds Cloudinary URLs from frontmatter
  shorthand (see Media below).
- **`data/`**
  - `homeLogos.ts` — the homepage logo-carousel list, intentionally
    independent of the projects collection; SVGs from `public/logos/`.
  - `lastUpdated.ts` — reads the latest commit date at build time
    (`git log -1 --format=%cI`) for the home nav's "Updated <Month> <Year>"
    label; falls back to "Portfolio".
  - `projectThumbnailAlts.ts` — slug → thumbnail alt-text map.
- **`plugins/`** — remark/rehype pipeline (below).
- **`scripts/`** — client TS/JS behaviours, initialised from layout
  `<script>` blocks on `astro:page-load` (background observer, media
  autoplay/lightbox, nav visibility/active-section, logo carousel,
  page-wipe transition, showcase/org overflow, caption fade, next-project
  brand swap, thumbnail video hover).
- **`styles/`** — `global.scss` `@use`s ~18 partials (`_tokens`, `_base`,
  `_buttons`, `_cards`, `_home`, `_nav-lg`, `_nav-sd`, `_project-*`,
  `_media*`, `_background`, `_rim`, `_progressive-blur`, `_logo-carousel`).
  Design tokens (colours, spacing, radii, gutters) live in `_tokens.scss`.

`public/` holds the Graphik web fonts, favicons/manifest, resume PDF
(`alanlong-resume.pdf`), `logos/`, SVG icons, the mesh background, and
placeholder assets. Root `scripts/` (outside `src/`) has one-off Node tools
(`build-mesh-bg.mjs`, `upload-linkedin-photos.mjs`).

---

## Content model (project frontmatter)

Frontmatter is the single source of truth, defined and validated in
`src/content/config.ts`. The richer fields are designed so one authored value
feeds multiple render sites. Key fields:

- **Identity/SEO:** `title`, `client`, `summary`, `metaDescription`, optional
  `slug` (defaults to the file id), `order` (homepage + next-project sort),
  `published` (set `false` to hide everywhere), `year`, `sector`.
- **Header kickers:** `industry` and `theme` render as small accent labels
  under the project `h1`.
- **Role:** `roleTitle` (defaults to "Lead Product Designer") and
  `roleSummary` drive the inline "My role" card.
- **`team[]`:** credits — `name`, `role`, optional `company`, `headshot`,
  `description`, `linkedin`. First member is the lead. Presence of `team`
  also auto-prepends a "My role" entry to the section index.
- **`orgs[]`:** client/employer/partner cards — `name`, `caption`, optional
  `logo`, `url`.
- **`impactMetrics[]`:** `value` + `label` + optional `description`. Consumed
  by **both** the project's Impact section and the homepage showcase (first 3
  entries fill the showcase's big-left / mid-top / mid-bottom slots — keep the
  array in display order).
- **`showcaseMedia`:** `topRight` (16:9) and `bottomRight` (square) image
  slots for the homepage showcase; each is `{ src, alt, objectPositionY? }`
  where `src` is a public-id relative to `mediaBase`.
- **`brand`:** `{ primary, secondary }` — drives the animated background
  gradient and is exposed as `--brand-primary` / `--brand-secondary`.
- **Media addressing:** `mediaBase` (Cloudinary folder prepended to relative
  body asset refs), optional `mediaVersion` (cache pin), and `thumbnail`
  (a single Cloudinary public-id; the pipeline derives both a `.jpg` poster
  and an `.mp4` loop). Legacy `thumbnailImage`/`thumbnailVideo` full URLs are
  still supported as a fallback.

**Showcase vs. card rule:** a project renders as the full `ProjectShowcase`
only when it has *both* `impactMetrics` and `showcaseMedia`; otherwise it's a
plain `ProjectCard`. The same check governs the "Next project" footer.

---

## Authoring a case study (MDX body)

After the frontmatter, the MDX body imports card components and writes the
narrative. Two conventions matter:

- **Section index / nav:** an italic-only kicker paragraph (`_Context_`)
  immediately followed by an `##` heading becomes a top-level nav section
  (kicker = label, slugified = id). `###` sub-sections are not nav targets.
  At least two sections are needed for the section index to appear.
- **Body media:** image/video are written as standard markdown image syntax
  with a *bare filename* (e.g. `![alt](welcome.mp4 "caption")`). The remark
  media plugin resolves it against `mediaBase` into a full Cloudinary URL
  before Astro's asset handling sees it. Full URLs and `/`-rooted public
  paths pass through untouched.

Components available in the body: `CardGroup` (bento grid; children opt into
`--card-span` / `--card-row-span` via inline `style`), `MediaGroup`,
`MetricCard`, `TestimonialCard`, `OrgCard`, `SourceNote`, `Card`.

---

## Media (Cloudinary)

`src/lib/cloudinary.mjs` builds every Cloudinary URL from the frontmatter
shorthand so authoring stays at filename level. Cloud name is `ajalong`.
Distinct transform pipelines: high-fidelity body media (`q_auto:best`,
srcset-driven), card thumbnails (eco quality, smaller width, fade loop, audio
stripped), and homepage showcase media (hero-ish, capped width). Thumbnail
posters are first-frame (`so_0`) extractions from the source video.
`resolveThumbnails()` prefers the new `thumbnail` public-id and falls back to
legacy full-URL fields. Note: `fps_auto` is intentionally omitted (needs a
Cloudinary FFmpeg add-on not enabled on this account — including it 400s).

---

## Build-time plugin pipeline

Registered in `astro.config.mjs`, run during the static build:

- **remark** (order matters): `remarkResolveMedia` (rewrites bare-filename
  body media to full Cloudinary URLs — must run *before* Astro's
  content-assets vite plugin), then `remarkBlockquoteCite`, then
  `remarkProjectSections`.
- **rehype:** `rehypeExternalLinks` (external-link handling), then
  `rehypeProjectMedia` (project media markup).

---

## SEO & analytics

Per-page canonical, OpenGraph, and Twitter card metadata come from
`BaseLayout`. JSON-LD: a `Person` schema on the homepage; `CreativeWork` +
`BreadcrumbList` on each case study, derived from the same frontmatter the
page renders. A default 1200×630 OG image (face-cropped headshot) is used when
a page passes no `image`. Sitemap via `@astrojs/sitemap`. Microsoft Clarity is
loaded after `window.load` to keep it off the critical path.
