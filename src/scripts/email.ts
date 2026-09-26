// Builds the contact email link from its two parts at runtime, so the full
// address never appears in the HTML. Without JavaScript the <noscript>
// fallback shows the "name at domain" form instead.

export function initEmail(): void {
  for (const slot of document.querySelectorAll<HTMLElement>('[data-email-user][data-email-domain]')) {
    const { emailUser: user, emailDomain: domain } = slot.dataset;
    if (!user || !domain) continue;

    const address = `${user}@${domain}`;
    const link = document.createElement('a');
    link.className = 'tap-link';
    link.href = `mailto:${address}`;
    link.textContent = address;
    slot.replaceChildren(link);
  }
}
