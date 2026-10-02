// Keeps the mobile number out of the HTML in any readable order. Each part is
// reversed and the parts are listed out of order with their position, so
// neither the attribute nor all the page's digits read in a row give the
// number. Pure, so the page script decodes what the build encodes.

type Encoded = ReadonlyArray<readonly [position: number, reversed: string]>;

const reverse = (text: string) => [...text].reverse().join('');

export function scrambleParts(parts: ReadonlyArray<string>): string {
  const encoded: Encoded = parts
    .map((part, position) => [position, reverse(part)] as const)
    .sort(([, a], [, b]) => (a < b ? -1 : a > b ? 1 : 0));
  return JSON.stringify(encoded);
}

export function unscrambleParts(text: string): string {
  return [...(JSON.parse(text) as Encoded)]
    .sort(([a], [b]) => a - b)
    .map(([, reversed]) => reverse(reversed))
    .join('');
}
