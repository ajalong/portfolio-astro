/**
 * Open/close handling for sub-section modal overlays. Each .sub-section-card
 * has data-opens-modal=<id> pointing at the corresponding <dialog id=…>;
 * clicking the card opens the dialog with .showModal() (so ESC and the
 * focus trap come for free) and backdrop-click or the in-modal close
 * button shut it again.
 */
export function initSubSectionModals(): () => void {
  const cards = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.sub-section-card[data-opens-modal]'),
  );
  const dialogs = Array.from(
    document.querySelectorAll<HTMLDialogElement>('[data-sub-section-modal]'),
  );
  if (!cards.length || !dialogs.length) return () => {};

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
  };

  const onDialogClick = (event: MouseEvent) => {
    const dialog = event.currentTarget as HTMLDialogElement;
    const target = event.target as HTMLElement;
    // Close button click: the button has data-sub-section-modal-close.
    if (target.closest('[data-sub-section-modal-close]')) {
      dialog.close();
      return;
    }
    // Backdrop click: native <dialog> dispatches click on the dialog
    // itself when the user clicks the backdrop area outside the content.
    if (target === dialog) dialog.close();
  };

  // ESC fires `cancel` first; let it close natively, no preventDefault
  // required because there's no exit animation tied to a class swap here.

  document.body.addEventListener('click', onCardClick);
  for (const d of dialogs) d.addEventListener('click', onDialogClick);

  return () => {
    document.body.removeEventListener('click', onCardClick);
    for (const d of dialogs) d.removeEventListener('click', onDialogClick);
  };
}
