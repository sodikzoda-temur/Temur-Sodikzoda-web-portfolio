/**
 * Joins the parts that exist with a comma, so a missing part leaves no stray
 * punctuation ("Vyatka State University, Kirov, Russia").
 */
export const joinParts = (...parts: ReadonlyArray<string | undefined>): string =>
  parts.filter((part): part is string => Boolean(part)).join(', ');

/** Splits text around the first occurrence of `name`, for emphasis in markup. */
export function splitAround(text: string, name: string): { before: string; match: string; after: string } | undefined {
  const index = text.indexOf(name);
  if (index < 0) return undefined;
  return { before: text.slice(0, index), match: name, after: text.slice(index + name.length) };
}
