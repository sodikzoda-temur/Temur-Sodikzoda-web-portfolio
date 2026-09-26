// Theme toggle. Pressed means dark. Without a saved choice the page follows
// the system setting; public/theme-init.js applies a saved choice before paint.

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'portfolio-theme';

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

export function initThemeToggle(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');
  if (buttons.length === 0) return;

  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  const current = (): Theme => {
    const chosen = root.dataset.theme;
    if (isTheme(chosen)) return chosen;
    return systemDark.matches ? 'dark' : 'light';
  };

  const sync = (): void => {
    const pressed = String(current() === 'dark');
    for (const button of buttons) button.setAttribute('aria-pressed', pressed);
  };

  const choose = (theme: Theme): void => {
    root.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage unavailable: the choice lasts for this page view only.
    }
    sync();
  };

  for (const button of buttons) {
    button.addEventListener('click', () => choose(current() === 'dark' ? 'light' : 'dark'));
  }

  systemDark.addEventListener('change', sync);

  // Keep other open tabs in step with a choice made here.
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    if (isTheme(event.newValue)) root.dataset.theme = event.newValue;
    else delete root.dataset.theme;
    sync();
  });

  sync();
}
