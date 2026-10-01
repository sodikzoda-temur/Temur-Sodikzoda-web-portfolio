// "Download PDF" opens the browser's print dialog, where the CV can be saved
// as a PDF. The button is shown only when JavaScript runs.

export function initPrint(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-print]')) {
    button.addEventListener('click', () => window.print());
  }
}
