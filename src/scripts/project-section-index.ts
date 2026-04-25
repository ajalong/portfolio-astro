/**
 * Project page section index — sticky jump-to-section nav.
 *
 * - Smooth-scrolls to the section on click
 * - Tracks the currently-visible section via IntersectionObserver and marks
 *   the matching link with `data-active` so CSS can style it.
 *
 * The nav is rendered by ProjectSectionIndex.astro with one `<a>` per section,
 * each carrying `data-section-id="…"` that matches an `id` on a section in
 * the article.
 */
export function initProjectSectionIndex(): void {
  const nav = document.querySelector<HTMLElement>('[data-project-section-index]');
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
  const jumpGroup = (links[0]?.closest('.project-section-index__group') as HTMLElement | null) ?? null;

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

  const setActive = (activeId: string | null): void => {
    const link = applyActiveState(activeId);
    moveIndicator(link);
  };

  // `rootMargin` biases the "visible" region to the top half of the viewport
  // so the active section flips over as its heading crosses the upper third.
  let currentActive: string | null = null;
  const observer = new IntersectionObserver(
    (entries) => {
      // Always recompute from all tracked targets (not just the entries) so we
      // handle the case where the active section leaves the bias zone but no
      // new section has entered yet.
      const visible = targets
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          const viewportH = window.innerHeight || document.documentElement.clientHeight;
          // Treat a section as "active" when its top is above the 50% line
          // and its bottom is still below the top of the viewport.
          return rect.top <= viewportH * 0.5 && rect.bottom > 0;
        })
        .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);

      const topmost = visible[0];
      const nextId = topmost?.id ?? null;
      if (nextId !== currentActive) {
        currentActive = nextId;
        setActive(nextId);
      }
      // Silence unused-variable warning; entries is required by the callback shape.
      void entries;
    },
    {
      rootMargin: '0px 0px -50% 0px',
      threshold: [0, 0.1, 0.5, 1],
    },
  );

  for (const target of targets) {
    observer.observe(target);
  }

  // Initial active state — in case the page loads already scrolled (e.g. back nav).
  // Pre-position the indicator without animating from top:0: set data-init
  // (disables top/height transitions), apply position, then flush and enable.
  const initialVisible = targets
    .filter((el) => el.getBoundingClientRect().top <= (window.innerHeight || 0) * 0.5 && el.getBoundingClientRect().bottom > 0)
    .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0];
  if (initialVisible) {
    currentActive = initialVisible.id;
    const link = applyActiveState(initialVisible.id);
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
  }
}
