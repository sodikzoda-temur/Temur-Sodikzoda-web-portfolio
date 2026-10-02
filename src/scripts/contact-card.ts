// "Save contact (.vcf)": builds the contact card in the browser from the
// fields in data-vcard, the two email parts and the scrambled phone number, so
// neither the full address nor the number appears in the HTML, then
// downloads it. Hidden without JavaScript.
import { unscrambleParts } from '../lib/scramble';
import { buildVcard, type ContactFields } from '../lib/vcard';

export function initContactCard(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-vcard]')) {
    button.addEventListener('click', () => {
      const { vcard, vcardFile, vcardUser, vcardDomain, vcardPhone } = button.dataset;
      if (!vcard || !vcardFile || !vcardUser || !vcardDomain || !vcardPhone) return;
      const phone = unscrambleParts(vcardPhone);
      const fields = JSON.parse(vcard) as ContactFields;
      const blob = new Blob([buildVcard(fields, `${vcardUser}@${vcardDomain}`, phone)], { type: 'text/vcard;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = vcardFile;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    });
  }
}
