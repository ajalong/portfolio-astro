# Orientation

New to the codebase or back after a gap? Read **`docs/ARCHITECTURE.md`**
first — it's the standing map of the stack, directory layout, content model,
media pipeline, and repo-clone inventory. This file (`CLAUDE.md`) covers the
working conventions and the multi-agent git protocol; keep both current.

---

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

# Multi-agent workflow (Cowork hub ⇄ Claude Code)

This repo is worked on from two places: **Cowork** (a central hub for
planning, research, content/asset creation, reviewing diffs, and committing
finished work) and **Claude Code** (the local live dev loop — `npm run dev`,
fast terminal iteration, large in-repo refactors on the user's machine).
They are separate agents with no direct channel to each other.

## Git is the only source of truth
Neither agent's working copy is authoritative — the GitHub remote is.
Cowork's mounted copy can lag behind the host (it has been seen 150+ commits
stale). Never assume your working tree reflects the other agent's latest work.

## Sync model (asymmetric — proven, not assumed)
Cowork's sandbox `.git` is a **separate copy**. It can `fetch` from origin
(read) but has **no push credentials** and no write path to the host.
Claude Code has full push access. So hand-offs are directional:

- **Cowork → Claude Code:** Cowork commits locally, exports the commit(s) as
  a `.patch` in its outputs folder, and messages the user with (a) the
  absolute patch path, (b) a one-line summary of intent, and (c) the
  branch/SHA it was authored against (so Code knows whether to use plain
  `git am` or `git am --3way`). Claude Code applies it on `staging`, pushes,
  then replies with the resulting origin SHA for Cowork to verify on its next
  fetch.
- **Claude Code → Cowork:** Code pushes `staging` (and `main` on deploy).
  Cowork runs `git fetch && git reset --hard origin/staging`. No patch needed.

Each agent syncs at session start before touching anything, commits locally
without asking, and pushes/hands off its work at session end.

## Branch default — both agents
- **All routine work lands on `staging`** — Cowork and Claude Code alike.
- **`main` only advances on the user's explicit "deploy to prod".** No agent
  merges to `main` or runs cross-branch deploy steps on its own initiative.
- **Invariant:** `staging` must always contain everything on `main`. Staging
  can be ahead, never behind. A prod deploy is a fast-forward of `main` to
  `staging`'s tip.
- A hand-off ends at "push `staging`." If a deploy seems warranted, frame it
  as a recommendation to the user — never as a step for the other agent.

## Delegating execution to Claude Code
When Cowork wants Code to do something that needs real-time local iteration
(a refactor with the dev server running, anything interactive) rather than
just review a patch: drop a spec file at `.claude/specs/<slug>.md`, treat it
as the source of truth, and reference it in the message to the user. Claude
Code executes against that file and reports back commit SHA(s) + a short
summary.

## Dispatch (mobile → desktop) routing
Dispatch (Cowork beta, Pro/Max) lets the user assign a task from the Claude
mobile app; it runs on the desktop and routes automatically — **dev tasks to
Claude Code, knowledge/content work to Cowork** — reusing the files,
connectors, and plugins configured here. It requires the desktop awake with
Claude Desktop running (remote control, not cloud compute). Implications:

- Dispatched work still obeys this file: `staging`-only, patch/push
  discipline, the `staging ⊇ main` invariant, deploy only on the user's
  explicit "deploy to prod".
- The push-credential asymmetry holds — anything that must reach `origin`
  routes through the Claude Code path, since the Cowork side can't push.
- The mobile go-ahead prompt is the human-in-the-loop checkpoint; treat it as
  the approval gate, especially before any `main`/deploy action.

---

# Extending this file

When you learn something during a session that would help a future session
avoid a mistake or a re-discovery — a project convention, a non-obvious
specificity trap, a shared component's caller list, a tool quirk — add it
here. Keep entries short and concrete. Prefer "here's the rule + why"
over long prose.
