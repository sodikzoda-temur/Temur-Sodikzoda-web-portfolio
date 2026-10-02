// Behaviour of the pages with the site header: menu, theme toggle, email link,
// contact card and print button. One entry point, so the browser makes one request.
import { initContactCard } from './contact-card';
import { initEmail } from './email';
import { initMenu } from './menu';
import { initPrint } from './print';
import { initThemeToggle } from './theme';

initMenu();
initThemeToggle();
initEmail();
initContactCard();
initPrint();
