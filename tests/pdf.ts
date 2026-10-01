import { inflateSync } from 'node:zlib';

/*
 * A small reader for the PDFs that Chromium prints with `tagged: true` and
 * `outline: true`: enough to find where each heading and list item landed.
 * It reads the page tree, the content streams (text positions and marked
 * content), the structure tree, the outline, link annotations and font names.
 * Chromium writes plain objects without object streams, which this relies on;
 * the tests compare what it finds with the page, so a change in that format
 * fails loudly instead of passing silently.
 */

/** A shown piece of text: its start point in points from the page's bottom-left corner. */
export interface Glyph {
  page: number;
  x: number;
  y: number;
  /** Points per unit of text space: 0.75 for text printed at 100% (96 CSS pixels to 72 points). */
  scale: number;
  /** Marked content it belongs to, which links it to a structure element. Page furniture has none. */
  mcid?: number;
}

/** A structure element (H2, P, LI...) with the marked content it covers, children included. */
export interface Element {
  type: string;
  content: { page: number; mcid: number }[];
  children: Element[];
}

export interface PrintedPdf {
  pages: { width: number; height: number }[];
  glyphs: Glyph[];
  elements: Element[];
  /** Outline entries in reading order: heading text, page and structure element. */
  outline: { title: string; page: number; element?: Element }[];
  links: { page: number; rect: number[] }[];
  /** Embedded font names without the subset prefix, e.g. "Inter-Regular". */
  fonts: string[];
}

type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m × n, with points as row vectors as in the PDF specification. */
const multiply = ([a, b, c, d, e, f]: Matrix, [a2, b2, c2, d2, e2, f2]: Matrix): Matrix => [
  a * a2 + b * c2,
  a * b2 + b * d2,
  c * a2 + d * c2,
  c * b2 + d * d2,
  e * a2 + f * c2 + e2,
  e * b2 + f * d2 + f2,
];

interface PdfObject {
  dict: string;
  stream?: Buffer;
}

function readObjects(buffer: Buffer): Map<number, PdfObject> {
  const text = buffer.toString('latin1');
  const objects = new Map<number, PdfObject>();
  const header = /(\d+) 0 obj\b/g;
  const end = />>\s*stream\r?\n|endobj/g;
  for (let match = header.exec(text); match; match = header.exec(text)) {
    end.lastIndex = header.lastIndex;
    const found = end.exec(text);
    if (!found) break;
    if (found[0] === 'endobj') {
      objects.set(Number(match[1]), { dict: text.slice(header.lastIndex, found.index) });
      header.lastIndex = end.lastIndex;
      continue;
    }
    const dict = text.slice(header.lastIndex, found.index + 2);
    const length = Number(/\/Length (\d+)(?!\d| \d+ R)/.exec(dict)?.[1]);
    if (!Number.isFinite(length)) throw new Error(`Object ${match[1]}: stream length is not a plain number`);
    const start = end.lastIndex;
    objects.set(Number(match[1]), { dict, stream: buffer.subarray(start, start + length) });
    header.lastIndex = start + length;
  }
  return objects;
}

const ref = (dict: string, key: string) => {
  const match = new RegExp(`/${key} (\\d+) 0 R`).exec(dict);
  return match ? Number(match[1]) : undefined;
};

const array = (dict: string, key: string) => new RegExp(`/${key} \\[([^\\]]*)\\]`).exec(dict)?.[1] ?? '';

const refs = (value: string) => [...value.matchAll(/(\d+) 0 R/g)].map((match) => Number(match[1]));

/** A PDF string, literal "(...)" or hex "<...>", as text. */
function decodeString(token: string): string {
  const bytes: number[] = [];
  if (token.startsWith('<')) {
    for (const pair of token.slice(1, -1).replace(/\s/g, '').match(/../g) ?? []) bytes.push(parseInt(pair, 16));
  } else {
    const escapes: Record<string, number> = { n: 10, r: 13, t: 9, b: 8, f: 12 };
    const body = token.slice(1, -1);
    for (let i = 0; i < body.length; i += 1) {
      if (body[i] !== '\\') {
        bytes.push(body.charCodeAt(i));
        continue;
      }
      const next = body[(i += 1)] ?? '';
      const octal = /^[0-7]{1,3}/.exec(body.slice(i))?.[0];
      if (octal) {
        bytes.push(parseInt(octal, 8));
        i += octal.length - 1;
      } else if (next in escapes) bytes.push(escapes[next]!);
      else if (next !== '\n' && next !== '\r') bytes.push(next.charCodeAt(0));
    }
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(Uint8Array.from(bytes.slice(2)));
  return String.fromCharCode(...bytes);
}

type Token = { kind: 'number'; value: number } | { kind: 'name' | 'operator' | 'other'; value: string };

/** Tokens of a content stream. Strings and arrays only matter as operands, so they are kept whole or skipped. */
function* tokens(content: string): Generator<Token> {
  const delimiter = /[\s()<>[\]{}/%]/;
  let i = 0;
  while (i < content.length) {
    const char = content[i]!;
    if (/\s/.test(char)) {
      i += 1;
    } else if (char === '%') {
      while (i < content.length && content[i] !== '\n' && content[i] !== '\r') i += 1;
    } else if (char === '(') {
      let depth = 0;
      let j = i;
      for (; j < content.length; j += 1) {
        if (content[j] === '\\') j += 1;
        else if (content[j] === '(') depth += 1;
        else if (content[j] === ')' && (depth -= 1) === 0) break;
      }
      yield { kind: 'other', value: content.slice(i, j + 1) };
      i = j + 1;
    } else if (content.startsWith('<<', i) || content.startsWith('>>', i)) {
      yield { kind: 'other', value: content.slice(i, i + 2) };
      i += 2;
    } else if (char === '<') {
      const j = content.indexOf('>', i);
      yield { kind: 'other', value: content.slice(i, j + 1) };
      i = j + 1;
    } else if ('[]{}'.includes(char)) {
      yield { kind: 'other', value: char };
      i += 1;
    } else {
      let j = i + 1;
      while (j < content.length && !delimiter.test(content[j]!)) j += 1;
      const word = content.slice(i, j);
      if (char === '/') yield { kind: 'name', value: word };
      else if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) yield { kind: 'number', value: Number(word) };
      else yield { kind: 'operator', value: word };
      i = j;
    }
  }
}

/** Start point and marked content of every text-showing operator on a page. */
function readGlyphs(content: string, page: number): Glyph[] {
  const glyphs: Glyph[] = [];
  const saved: Matrix[] = [];
  const marked: (number | undefined)[] = [];
  let ctm = IDENTITY;
  let line = IDENTITY;
  let leading = 0;
  let operands: Token[] = [];
  const numbers = (count: number) => operands.slice(-count).map((token) => (token.kind === 'number' ? token.value : NaN));
  const moveLine = (tx: number, ty: number) => {
    line = multiply([1, 0, 0, 1, tx, ty], line);
  };
  const show = () => {
    const [a, b, , , x, y] = multiply(line, ctm);
    const mcid = marked.findLast((id) => id !== undefined);
    glyphs.push({ page, x, y, scale: Math.hypot(a, b), mcid });
  };

  for (const token of tokens(content)) {
    if (token.kind !== 'operator') {
      operands.push(token);
      continue;
    }
    switch (token.value) {
      case 'q':
        saved.push(ctm);
        break;
      case 'Q':
        ctm = saved.pop() ?? IDENTITY;
        break;
      case 'cm':
        ctm = multiply(numbers(6) as Matrix, ctm);
        break;
      case 'BT':
        line = IDENTITY;
        break;
      case 'Tm':
        line = numbers(6) as Matrix;
        break;
      case 'Td':
        moveLine(...(numbers(2) as [number, number]));
        break;
      case 'TD': {
        const [tx, ty] = numbers(2) as [number, number];
        leading = -ty;
        moveLine(tx, ty);
        break;
      }
      case 'TL':
        leading = numbers(1)[0]!;
        break;
      case 'T*':
        moveLine(0, -leading);
        break;
      case 'Tj':
      case 'TJ':
        show();
        break;
      case "'":
      case '"':
        moveLine(0, -leading);
        show();
        break;
      case 'BMC':
        marked.push(undefined);
        break;
      case 'BDC': {
        const key = operands.findIndex((operand) => operand.kind === 'name' && operand.value === '/MCID');
        const id = operands[key + 1];
        marked.push(key >= 0 && id?.kind === 'number' ? id.value : undefined);
        break;
      }
      case 'EMC':
        marked.pop();
        break;
    }
    operands = [];
  }
  return glyphs;
}

export function readPdf(buffer: Buffer): PrintedPdf {
  const objects = readObjects(buffer);
  const get = (id: number | undefined) => (id === undefined ? undefined : objects.get(id));
  const catalog = [...objects.values()].find((object) => /\/Type \/Catalog\b/.test(object.dict));
  if (!catalog) throw new Error('No document catalogue');

  // Pages in order, following the page tree
  const pageIds: number[] = [];
  const collect = (id: number) => {
    const node = get(id);
    if (!node) return;
    if (/\/Type \/Pages\b/.test(node.dict)) refs(array(node.dict, 'Kids')).forEach(collect);
    else pageIds.push(id);
  };
  collect(ref(catalog.dict, 'Pages') ?? -1);
  const pageIndex = new Map(pageIds.map((id, index) => [id, index]));

  const pages: PrintedPdf['pages'] = [];
  const glyphs: Glyph[] = [];
  const links: PrintedPdf['links'] = [];
  pageIds.forEach((id, index) => {
    const { dict } = get(id)!;
    const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = array(dict, 'MediaBox').trim().split(/\s+/).map(Number);
    pages.push({ width: x1 - x0, height: y1 - y0 });
    const contentIds = /\/Contents \[/.test(dict) ? refs(array(dict, 'Contents')) : [ref(dict, 'Contents')];
    const content = contentIds
      .map((contentId) => get(contentId))
      .map((stream) => {
        if (!stream?.stream) return '';
        const data = /\/FlateDecode/.test(stream.dict) ? inflateSync(stream.stream) : stream.stream;
        return data.toString('latin1');
      })
      .join('\n');
    glyphs.push(...readGlyphs(content, index));
    for (const annotation of refs(array(dict, 'Annots')).map(get)) {
      if (annotation && /\/Subtype \/Link\b/.test(annotation.dict)) {
        links.push({ page: index, rect: array(annotation.dict, 'Rect').trim().split(/\s+/).map(Number) });
      }
    }
  });

  // Structure elements and the marked content under each
  interface RawElement {
    type: string;
    page?: number;
    mcids: { mcid: number; page?: number }[];
    children: number[];
  }
  const raw = new Map<number, RawElement>();
  for (const [id, { dict }] of objects) {
    if (!/\/Type \/StructElem\b/.test(dict)) continue;
    const kids = /\/K (\[[^\]]*\]|\d+ 0 R|\d+)/.exec(dict)?.[1] ?? '';
    const mcids: RawElement['mcids'] = [];
    const rest = kids
      .replace(/<<([^>]*)>>/g, (_, inner: string) => {
        const mcid = /\/MCID (\d+)/.exec(inner);
        if (mcid) mcids.push({ mcid: Number(mcid[1]), page: pageIndex.get(ref(inner, 'Pg') ?? -1) });
        return ' ';
      })
      .replace(/(\d+) 0 R/g, ' $1R ');
    const children = [...rest.matchAll(/(\d+)R/g)].map((match) => Number(match[1]));
    for (const match of rest.replace(/\d+R/g, ' ').matchAll(/\d+/g)) mcids.push({ mcid: Number(match[0]) });
    raw.set(id, { type: /\/S \/(\w+)/.exec(dict)?.[1] ?? '', page: pageIndex.get(ref(dict, 'Pg') ?? -1), mcids, children });
  }
  const contentOf = (id: number, inherited?: number): Element['content'] => {
    const element = raw.get(id);
    if (!element) return [];
    const page = element.page ?? inherited;
    return [
      ...element.mcids.flatMap(({ mcid, page: own }) => (own ?? page) === undefined ? [] : [{ page: (own ?? page)!, mcid }]),
      ...element.children.flatMap((child) => contentOf(child, page)),
    ];
  };
  const elementById = new Map<number, Element>([...raw].map(([id, element]) => [id, { type: element.type, content: contentOf(id), children: [] }]));
  for (const [id, element] of raw) {
    elementById.get(id)!.children = element.children.flatMap((child) => elementById.get(child) ?? []);
  }

  // Outline, depth first
  const outline: PrintedPdf['outline'] = [];
  const walk = (parent: number | undefined) => {
    for (let id = ref(get(parent)?.dict ?? '', 'First'); id !== undefined; id = ref(get(id)?.dict ?? '', 'Next')) {
      const { dict } = get(id)!;
      const title = /\/Title (\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>)/.exec(dict)?.[1] ?? '()';
      outline.push({
        title: decodeString(title),
        page: pageIndex.get(refs(array(dict, 'Dest'))[0] ?? -1) ?? -1,
        element: elementById.get(ref(dict, 'SE') ?? -1),
      });
      walk(id);
    }
  };
  walk(ref(catalog.dict, 'Outlines'));

  const fonts = [...new Set([...buffer.toString('latin1').matchAll(/\/FontName \/(?:[A-Z]{6}\+)?([^\s/<>[\]()]+)/g)].map((m) => m[1]!))];

  return { pages, glyphs, elements: [...elementById.values()], outline, links, fonts };
}
