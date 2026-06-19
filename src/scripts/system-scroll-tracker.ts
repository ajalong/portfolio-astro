const ENTRY_TIERS = new Set(['components', 'patterns', 'views']);

function setActive(sectionId: string): void {
  // Determine if this is an entry with a parent tier
  const sectionEl = document.querySelector<HTMLElement>(`[data-section="${sectionId}"]`);
  const tier = sectionEl?.dataset.tier ?? null;
  const isEntry = tier !== null && ENTRY_TIERS.has(tier);
  // Which tier to expand: parent tier if this is an entry, the section itself if it's a tier
  const activeTierId = isEntry ? tier : (ENTRY_TIERS.has(sectionId) ? sectionId : null);

  // Update nav items in both sidebar and top bar
  document.querySelectorAll<HTMLElement>('[data-nav-item]').forEach((item) => {
    const navId = item.dataset.navItem;
    // Active if: exact match, or matches parent tier while an entry is active
    const isActive = navId === sectionId || (isEntry && navId === tier);
    item.classList.toggle('is-active', isActive);
    item.setAttribute('aria-current', navId === sectionId ? 'location' : 'false');
  });

  // Sidebar sub-nav: expand the active entry tier, collapse all others
  document.querySelectorAll<HTMLElement>('[data-subnav]').forEach((subnav) => {
    const expand = activeTierId !== null && subnav.dataset.subnav === activeTierId;
    subnav.toggleAttribute('hidden', !expand);
    subnav.classList.toggle('is-expanded', expand);
  });

  // Top nav sub-row: show when in an entry tier, filter items by tier
  const subRow = document.querySelector<HTMLElement>('.system-top-nav__sub-row');
  if (subRow) {
    const showSubRow = activeTierId !== null;
    subRow.classList.toggle('is-visible', showSubRow);
    subRow.querySelectorAll<HTMLElement>('[data-subnav-tier]').forEach((item) => {
      item.toggleAttribute('hidden', !(showSubRow && item.dataset.subnavTier === activeTierId));
    });
  }
}

const intersecting = new Set<string>();
let currentActive = '';
let observer: IntersectionObserver | null = null;

export function initSystemScrollTracker(): void {
  // Disconnect any observer from a previous page-load cycle
  observer?.disconnect();
  intersecting.clear();
  currentActive = '';

  const sections = document.querySelectorAll<HTMLElement>('[data-section]');
  if (sections.length === 0) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = (entry.target as HTMLElement).dataset.section;
        if (!id) return;
        if (entry.isIntersecting) {
          intersecting.add(id);
        } else {
          intersecting.delete(id);
        }
      });

      // Activate the topmost intersecting section (first in DOM order)
      let newActive = currentActive;
      for (const section of sections) {
        const id = section.dataset.section;
        if (id && intersecting.has(id)) {
          newActive = id;
          break;
        }
      }

      if (newActive !== currentActive) {
        currentActive = newActive;
        setActive(currentActive);
      }
    },
    {
      // Trigger zone: the strip between 10% and 20% from the viewport top.
      // A section becomes active when its content enters this strip.
      rootMargin: '-10% 0px -80% 0px',
      threshold: 0,
    }
  );

  sections.forEach((el) => observer!.observe(el));
}
