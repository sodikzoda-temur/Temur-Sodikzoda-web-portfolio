// The contact card (vCard 3.0). Pure, so the page script can build the same
// text in the browser that the QR code encodes at build time.

export interface ContactFields {
  givenName: string;
  familyName: string;
  org: string;
  title: string;
  url: string;
  locality: string;
  country: string;
  /** Profile links, shown with their labels on phones. */
  links: ReadonlyArray<{ label: string; href: string }>;
}

/**
 * Text value escaping (RFC 2426): backslash, comma, semicolon and line breaks.
 * Any line break (CRLF, LF or a bare CR) becomes one escaped "n", so a value
 * can never end a line early.
 */
const escape = (value: string) => value.replace(/[\\,;]/g, (char) => `\\${char}`).replace(/\r\n|\r|\n/g, '\\n');

/** Lines longer than 75 bytes continue on the next line after CRLF and a space, never inside a character. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** Messenger links made from the phone number (international form, "+" and digits). */
const MESSENGERS = [
  { label: 'WhatsApp', href: (phone: string) => `https://wa.me/${phone.slice(1)}` },
  { label: 'Telegram', href: (phone: string) => `https://t.me/${phone}` },
] as const;

/**
 * The card as text: UTF-8, CRLF line endings. The compact card (for the QR
 * code, which must stay small enough to scan) keeps name, organisation, role,
 * phone, email and the site; the site links to the profiles.
 */
export function buildVcard(fields: ContactFields, email: string, phone: string, { compact = false } = {}): string {
  const links = compact ? [] : [...fields.links, ...MESSENGERS.map((messenger) => ({ label: messenger.label, href: messenger.href(phone) }))];
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escape(fields.familyName)};${escape(fields.givenName)};;;`,
    `FN:${escape(`${fields.givenName} ${fields.familyName}`)}`,
    `ORG:${escape(fields.org)}`,
    `TITLE:${escape(fields.title)}`,
    `TEL;TYPE=CELL:${phone}`,
    `EMAIL;TYPE=INTERNET:${email}`,
    `URL:${fields.url}`,
    ...(compact ? [] : [`ADR;TYPE=WORK:;;;${escape(fields.locality)};;;${escape(fields.country)}`]),
    ...links.flatMap((link, index) => [`item${index + 1}.URL:${link.href}`, `item${index + 1}.X-ABLabel:${escape(link.label)}`]),
    'END:VCARD',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
