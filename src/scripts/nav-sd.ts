/**
 * Project page standard-viewport section nav — collapsible top bar.
 *
 * Behaviour:
 * - Toggle button opens / closes the section list (mirrors aria-expanded).
 * - Click outside the menu closes it. Escape key closes it.
 * - Section link click: smooth-scrolls to the section and closes the menu.
 * - Subscribes to `trackActiveSection` (shared with NavLg) to update
 *   both the bar's section label and the menu's active link styling
 *   (data-active attribute → row colour shift; the menu has no rail
 *   indicator — the active state is communicated by colour alone).
 */
import { trackActiveSection } from './project-active-section';

export function initNavSd(): void {
  const nav = document.querySelector<HTMLElement>('[data-nav-sd]');
  if (!nav) return;

  const toggle = nav.querySelector<HTMLButtonElement>('[data-nav-sd-toggle]');
  const menu = nav.querySelector<HTMLElement>('[data-nav-sd-menu]');
  // `activeLabelTrack` is the inner sliding track inside .nav-sd__section-label.
  // Item-per-text spans are stacked vertically inside it; the track is
  // translated to slide them through the clipped one-line viewport above.
  const activeLabelTrack = nav.querySelector<HTMLElement>('[data-nav-sd-active-label]');
  if (!toggle || !menu || !activeLabelTrack) return;

  // Center label ("alanlong.design/<slug>"). Hidden while at the top of
  // the page (active = first section, or null = scrolled above all
  // sections) so the URL only appears once the reader has moved past the
  // intro. Project pages have non-empty text; on the home page the span
  // is empty and the fade is a no-op visually.
  const projectLabel = nav.querySelector<HTMLElement>('[data-nav-sd-project]');
  const hasProjectLabel = !!projectLabel && (projectLabel.textContent ?? '').trim().length > 0;

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

  // ── Open / close ──────────────────────────────────────────────────────
  const setOpen = (open: boolean): void => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.toggleAttribute('hidden', !open);
    // Move focus into the menu on open so keyboard users land on the first
    // section link rather than having to tab from the toggle. Escape +
    // outside-click already return focus to the toggle, so only steal focus
    // on the open transition (never on close).
    if (open) links[0]?.focus();
  };
  const isOpen = (): boolean => toggle.getAttribute('aria-expanded') === 'true';

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  // Click outside closes the menu.
  document.addEventListener('click', (event) => {
    if (!isOpen()) return;
    const target = event.target as Node;
    if (nav.contains(target)) return;
    setOpen(false);
  });

  // Escape closes the menu and returns focus to the toggle.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isOpen()) return;
    setOpen(false);
    toggle.focus();
  });

  // ── Section link click ────────────────────────────────────────────────
  // Smooth-scroll without leaving #id in the URL, then close the menu.
  for (const link of links) {
    link.addEventListener('click', (event) => {
      const id = link.dataset.sectionId;
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setOpen(false);
    });
  }

  // ── Active section sync ───────────────────────────────────────────────
  const applyActiveState = (activeId: string | null): HTMLAnchorElement | null => {
    let activeLink: HTMLAnchorElement | null = null;
    for (const [id, link] of linkById) {
      if (id === activeId) {
        link.setAttribute('data-active', '');
        // Expose the active section to assistive tech, not just visually.
        // `true` (rather than `page`) because these are in-page section
        // anchors, not links between separate pages.
        link.setAttribute('aria-current', 'true');
        activeLink = link;
      } else {
        link.removeAttribute('data-active');
        link.removeAttribute('aria-current');
      }
    }
    return activeLink;
  };

  // ── Bar label swap (animated) ─────────────────────────────────────────
  // Each call appends a new item to the track and slides the track up so
  // the newest item is the one shown in the clipped viewport. After the
  // transition settles, all-but-the-latest item is pruned and the transform
  // is reset to 0 (without animation) — keeps the track from growing
  // unbounded as the user scrolls through many sections.
  //
  // Rapid successive calls (e.g. fast scroll across multiple sections) just
  // queue more items into the track; each call retargets the transform to
  // whichever item is latest, so the slide always ends on the right text.
  const ITEM_CLASS = 'nav-sd__section-label-item';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const makeItem = (text: string): HTMLSpanElement => {
    const item = document.createElement('span');
    item.className = ITEM_CLASS;
    item.textContent = text;
    return item;
  };

  const updateBarLabel = (link: HTMLAnchorElement | null): void => {
    // Fall back to first link's label when nothing is active so the bar
    // never reads empty (matches the SSR default).
    const label = link?.dataset.label ?? links[0]?.dataset.label ?? '';
    const currentItem = activeLabelTrack.lastElementChild as HTMLElement | null;
    if (currentItem && currentItem.textContent === label) return;

    // Reduced motion: rewrite the visible item in place. No track movement.
    if (prefersReducedMotion.matches) {
      if (currentItem) {
        currentItem.textContent = label;
      } else {
        activeLabelTrack.appendChild(makeItem(label));
      }
      return;
    }

    // Append the new item below the currently-visible one.
    activeLabelTrack.appendChild(makeItem(label));

    // Slide the track so the new (last) item lands in the viewport. With N
    // items each 100/N percent of the track height, showing item index
    // (N-1) means translating up by ((N-1)/N) × 100%.
    const total = activeLabelTrack.children.length;
    const latestIndex = total - 1;
    const percentage = (latestIndex / total) * 100;

    // Force layout so the transition starts from the current visual state
    // rather than batching with the appendChild reflow above.
    void activeLabelTrack.offsetHeight;
    activeLabelTrack.style.transform = `translateY(-${percentage}%)`;

    // After the slide finishes, drop everything except the newest item and
    // reset the transform (without animation) so the next update starts
    // from a clean baseline.
    const onEnd = (event: TransitionEvent): void => {
      if (event.target !== activeLabelTrack || event.propertyName !== 'transform') return;
      activeLabelTrack.removeEventListener('transitionend', onEnd);

      while (activeLabelTrack.children.length > 1) {
        activeLabelTrack.firstElementChild?.remove();
      }
      activeLabelTrack.style.transition = 'none';
      activeLabelTrack.style.transform = 'translateY(0)';
      // Reflow to commit the no-transition reset, then re-enable.
      void activeLabelTrack.offsetHeight;
      activeLabelTrack.style.transition = '';
    };
    activeLabelTrack.addEventListener('transitionend', onEnd);
  };

  const firstSectionId = links[0]?.dataset.sectionId ?? null;

  const syncProjectLabel = (activeId: string | null): void => {
    if (!hasProjectLabel || !projectLabel) return;
    const atTop = activeId === null || activeId === firstSectionId;
    projectLabel.toggleAttribute('data-hidden', atTop);
  };

  trackActiveSection(targets, (activeId) => {
    const link = applyActiveState(activeId);
    updateBarLabel(link);
    syncProjectLabel(activeId);
  });
}
