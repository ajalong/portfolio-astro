/**
 * Open/close handling for sub-section modal overlays. Each .sub-section-card
 * has data-opens-modal=<id> pointing at the corresponding <dialog id=…>;
 * clicking the card opens the dialog with .showModal() (so ESC and the
 * focus trap come for free) and backdrop-click or the in-modal close
 * button shut it again.
 *
 * While a dialog is open, html.sub-section-modal-open is set so the
 * underlying page can't scroll. iOS Safari's native scroll-lock for
 * <dialog>:modal isn't reliable enough on its own.
 */
const OPEN_CLASS = 'sub-section-modal-open';

export function initSubSectionModals(): () => void {
  const cards = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.sub-section-card[data-opens-modal]'),
  );
  const dialogs = Array.from(
    document.querySelectorAll<HTMLDialogElement>('[data-sub-section-modal]'),
  );
  if (!cards.length || !dialogs.length) return () => {};

  const lockPage = () => document.documentElement.classList.add(OPEN_CLASS);
  const unlockPage = () => {
    // Only unlock when no other sub-section modal is still open.
    const stillOpen = dialogs.some((d) => d.open);
    if (!stillOpen) document.documentElement.classList.remove(OPEN_CLASS);
  };

  const onCardClick = (event: MouseEvent) => {
    const card = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '.sub-section-card[data-opens-modal]',
    );
    if (!card) return;
    const id = card.getAttribute('data-opens-modal');
    if (!id) return;
    const dialog = document.getElementById(id) as HTMLDialogElement | null;
    if (!dialog) return;
    event.preventDefault();
    // showModal would otherwise focus the dialog and the browser would
    // scroll its top: 0 anchor into view; restore the user's scroll.
    const scrollY = window.scrollY;
    dialog.showModal();
    if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
    // Reset the dialog's own scroll position — if a previous open scrolled
    // it down, showModal doesn't reset it.
    dialog.scrollTop = 0;
    lockPage();
  };

  const onDialogClick = (event: MouseEvent) => {
    const dialog = event.currentTarget as HTMLDialogElement;
    const target = event.target as HTMLElement;
    // Close button click.
    if (target.closest('[data-sub-section-modal-close]')) {
      dialog.close();
      return;
    }
    // Backdrop click — the dialog dispatches click on itself when the
    // user clicks outside the content panel.
    if (target === dialog) dialog.close();
  };

  const onDialogClose = () => unlockPage();

  document.body.addEventListener('click', onCardClick);
  for (const d of dialogs) {
    d.addEventListener('click', onDialogClick);
    d.addEventListener('close', onDialogClose);
    d.addEventListener('cancel', onDialogClose);
  }

  return () => {
    document.body.removeEventListener('click', onCardClick);
    for (const d of dialogs) {
      d.removeEventListener('click', onDialogClick);
      d.removeEventListener('close', onDialogClose);
      d.removeEventListener('cancel', onDialogClose);
    }
    document.documentElement.classList.remove(OPEN_CLASS);
  };
}
