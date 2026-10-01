// Behaviour of the pages with the site header: menu, theme toggle, email link
// and print button. One entry point, so the browser makes one request.
import { initEmail } from './email';
import { initMenu } from './menu';
import { initPrint } from './print';
import { initThemeToggle } from './theme';

initMenu();
initThemeToggle();
initEmail();
initPrint();
