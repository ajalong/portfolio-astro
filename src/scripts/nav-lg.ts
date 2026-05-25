/**
 * Project page large-viewport section nav — sticky jump-to-section sidebar.
 *
 * - Smooth-scrolls to the section on click
 * - Tracks the currently-visible section (via `trackActiveSection`) and marks
 *   the matching link with `data-active` so CSS can style it
 * - Drives the rail indicator (a single bar on the jump-links group) by
 *   writing --active-top / --active-height to the group element; CSS handles
 *   the smooth slide between positions
 *
 * The nav is rendered by NavLg.astro with one `<a>` per section, each
 * carrying `data-section-id="…"` that matches an `id` on a section in the
 * article. NavSd subscribes to the same active-section tracking so
 * both navs stay in lockstep without knowing about each other.
 */
import { trackActiveSection } from './project-active-section';

export function initNavLg(): void {
  const nav = document.querySelector<HTMLElement>('[data-nav-lg]');
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[data-section-id]'));
  if (links.length === 0) return;

  const linkById = new Map<string, HTMLAnchorElement>();
  const targets: HTMLElement[] = [];

  for (const link of links) {
    const id = link.dataset.sectionId;
    if (!id) continue;
    const target = document.getElementById(id);
    if (!target) continue;
    linkById.set(id, link);
    targets.push(target);
  }

  // Smooth-scroll on click, without leaving #id in the URL (keeps the address bar tidy).
  for (const link of links) {
    link.addEventListener('click', (event) => {
      const id = link.dataset.sectionId;
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Indicator rail — a single bar on the jump-links group that slides between
  // active items via --active-top / --active-height (driven from here).
  const jumpGroup = (links[0]?.closest('.nav-lg__group') as HTMLElement | null) ?? null;

  const applyActiveState = (activeId: string | null): HTMLAnchorElement | null => {
    let activeLink: HTMLAnchorElement | null = null;
    for (const [id, link] of linkById) {
      if (id === activeId) {
        link.setAttribute('data-active', '');
        activeLink = link;
      } else {
        link.removeAttribute('data-active');
      }
    }
    return activeLink;
  };

  const moveIndicator = (link: HTMLAnchorElement | null): void => {
    if (!jumpGroup) return;
    if (link) {
      jumpGroup.style.setProperty('--active-top', `${link.offsetTop}px`);
      jumpGroup.style.setProperty('--active-height', `${link.offsetHeight}px`);
      jumpGroup.setAttribute('data-has-active', '');
    } else {
      jumpGroup.removeAttribute('data-has-active');
    }
  };

  // First-fire flag: on the initial subscribe callback we pre-position the
  // indicator without animating from top:0. `data-init` disables the
  // top/height transitions; we flush the position then re-enable.
  let firstFire = true;

  trackActiveSection(targets, (activeId) => {
    const link = applyActiveState(activeId);

    if (firstFire) {
      firstFire = false;
      if (jumpGroup && link) {
        jumpGroup.setAttribute('data-init', '');
        jumpGroup.style.setProperty('--active-top', `${link.offsetTop}px`);
        jumpGroup.style.setProperty('--active-height', `${link.offsetHeight}px`);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            jumpGroup.setAttribute('data-has-active', '');
            // Give the opacity fade-in time to finish before re-enabling
            // top/height transitions for subsequent moves.
            window.setTimeout(() => jumpGroup.removeAttribute('data-init'), 260);
          });
        });
      }
      return;
    }

    moveIndicator(link);
  });
}
