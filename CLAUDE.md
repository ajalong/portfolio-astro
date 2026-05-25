# Operating rules

These rules exist because each one maps to a specific mistake that wasted
the user's time. Re-read them every session.

## Refactors must preserve existing behavior by default
When adding a prop, parameter, or option to something with existing callers,
default it so untouched call sites behave identically. If no safe default
exists, stop and ask — don't ship a change that silently requires every
caller to update.

## Trace every caller before changing a shared component
After editing a component/function used in more than one place, list its
callers and read each one. Confirm the change doesn't regress them. Do
this before reporting the change as done.

## Minimum viable change
Don't introduce new conditionals, branches, or abstractions beyond what
the task requires. If two callers differ, prefer one straightforward path
with props over a `{cond ? A : B}` fork.

## Do the obvious follow-through
When a change makes related work obvious — rename a file after
consolidating, delete a now-unused component, update a doc comment that's
now wrong — do it in the same turn. Don't wait to be asked.

## When the user pushes back, slow down
Repeated correction on the same task = stop iterating, re-read the
relevant files, and state what you now understand before making the next
edit.

## Don't conflate padding and margin
The user has corrected this. If they say "padding" on an element where the
spacing in question is actually margin, ask before acting.

---

# Project conventions

## Viewport model (mobile-first)
Three viewports, two named breakpoints in `src/styles/_tokens.scss`:

- **Mobile** (≤ `$breakpoint-medium`, currently 460px)
- **Medium** (461px – `$breakpoint-large` − 1, currently up to 1079px)
- **Large** (≥ `$breakpoint-large`, currently 1080px)

Naming follows mobile-first: `Sd` = "standard" (mobile + medium), `Lg` =
"large". Avoid `Mobile`/`Desktop` in names.

## Shared nav components
`NavSd` (top floating bar + dropdown) and `NavLg` (sidebar) are used on
**both** the home page and project pages. Both subscribe to
`trackActiveSection` from `src/scripts/project-active-section.ts`.

Props on `NavSd` adapt content per context:
- `backHref` defaults to `/` (homepage refreshes harmlessly)
- `backLabel` / `backLabelShort` for the back cell
- `centerLabel` defaults to the URL slug uppercased for `/project/*`
- `ariaLabel` for the `<nav>` element

Before editing either, check both `src/pages/index.astro` and
`src/layouts/ProjectLayout.astro` (the two callers).

## SCSS architecture
- Partials use `@use`, not `@import`
- Tokens (`--grey1`, `--unit-8`, `--radius-sm`, `--page-gutter-x`, etc.)
  live in `src/styles/_tokens.scss` — prefer tokens over raw values
- Global rules in `_base.scss` can have surprising specificity (e.g.
  `.page_container h2` is 0,1,1). When overriding, check specificity
  before assuming a class selector is enough.

## Project frontmatter as cross-page data source
When the same data needs to appear in both the project page body (MDX)
and somewhere external (homepage showcase, sitemap, etc.), author it in
project frontmatter — not inline in MDX — and iterate in both places.

Existing pattern: `impactMetrics` in `src/content/config.ts`. GSK's
impact section iterates with `{frontmatter.impactMetrics?.map(...)}` and
the homepage showcase reads `featuredProject.data.impactMetrics.slice(0, 3)`.
Adding metrics in one place updates both.

In Astro MDX files, the file's own frontmatter is available as the
`frontmatter` global — no import needed.

## CardGroup children
Direct children of `<CardGroup>` can opt into both a column span and a row
span via inline custom properties on `style`:

- `style="--card-span: 2"` — span 2 columns
- `style="--card-row-span: 2"` — span 2 rows
- `style="--card-span: 2; --card-row-span: 2"` — span a 2×2 block

Both default to 1, so any caller that omits them is unaffected. When
laying out non-trivial bento grids, remember CSS Grid's default
`auto-flow: row` does **not** backtrack: source order may need to be
non-reading-order to let the auto-placer fill the cells you want.
See `src/pages/index.astro` (homepage showcase) for an example —
source order is A, B, C, D, F, E so that F's 2×2 block gets placed
before the small E card claims its slot.

## Cloudinary media
Project thumbnails resolve through `src/lib/cloudinary.mjs` —
`resolveThumbnails(data)` accepts either the new `thumbnail`
(`publicId` + `mediaBase`) shape or legacy `thumbnailImage` /
`thumbnailVideo` full URLs.

## Build / dev
- `npm run dev` starts the Astro dev server on `localhost:4321`
- A long-running dev server is usually already up — check before
  restarting (user is on a usage-limited plan)

---

# Extending this file

When you learn something during a session that would help a future session
avoid a mistake or a re-discovery — a project convention, a non-obvious
specificity trap, a shared component's caller list, a tool quirk — add it
here. Keep entries short and concrete. Prefer "here's the rule + why"
over long prose.
