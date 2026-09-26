// Disclosure menu for small screens. The button toggles the panel; Escape,
// choosing a link, pressing outside the header or moving focus out of it
// closes the panel. Without JavaScript the navigation is always shown.

export function initMenu(): void {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  const toggle = header?.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const panel = header?.querySelector<HTMLElement>('[data-menu]');
  if (!header || !toggle || !panel) return;

  const isOpen = (): boolean => toggle.getAttribute('aria-expanded') === 'true';

  const setOpen = (open: boolean): void => {
    toggle.setAttribute('aria-expanded', String(open));
    header.toggleAttribute('data-menu-open', open);
  };

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isOpen()) return;
    setOpen(false);
    toggle.focus();
  });

  panel.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
  });

  // pointerdown also fires for taps on non-interactive areas in mobile Safari.
  document.addEventListener('pointerdown', (event) => {
    if (isOpen() && event.target instanceof Node && !header.contains(event.target)) setOpen(false);
  });

  header.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    if (isOpen() && next instanceof Node && !header.contains(next)) setOpen(false);
  });

  // The panel is a small-screen pattern; reset it when the layout widens.
  window.matchMedia('(width >= 64em)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}
