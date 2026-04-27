/**
 * Build-time read of the most recent commit date from `git log`.
 *
 * Used in the home page sticky nav to show "Updated <Month> <Year>" instead
 * of a static "Portfolio" label. Runs in Astro's frontmatter (Node context)
 * during SSG, so the value is baked into the static HTML — no runtime
 * network request, no GitHub token needed.
 *
 * On Netlify and similar CI hosts, the build runs against a real (shallow)
 * git clone, so HEAD is the most recent public commit on the default branch.
 * In local dev with unpushed commits the value will reflect those — that's
 * fine for display, since the production build is what visitors see.
 *
 * Falls back to "Portfolio" if git isn't available for any reason (no .git
 * directory, missing binary, etc.) — never breaks the build.
 */

import { execSync } from 'node:child_process';

/** Returns "Updated April 2026" for the most recent commit, or "Portfolio" on error. */
export function getLastUpdatedLabel(): string {
  try {
    // %cI = committer date in strict ISO 8601. Committer (not author) date
    // is what GitHub shows and what updates on rebase, so it best matches
    // "last public update."
    const iso = execSync('git log -1 --format=%cI', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!iso) return 'Portfolio';

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Portfolio';

    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `Updated ${month} ${year}`;
  } catch {
    return 'Portfolio';
  }
}
