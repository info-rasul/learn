// Checks lesson files in public/data/lessons.
// Usage: node scripts/validate-lessons.mjs [firstId lastId] [--book path/to/book.md]
// With --book, reference answers that appear word for word in the book are reported as errors.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : null;
};
const bookPath = option('--book');
// --local checks the owner-only lessons built from the book's exercises (public/data/book).
const local = args.includes('--local') && args.splice(args.indexOf('--local'), 1);
const [first = 1, last = 145] = args.map(Number);

const dir = join(import.meta.dirname, '..', 'public', 'data', ...(local ? ['book'] : []), 'lessons');
const MIN_ITEMS = local ? 5 : 20;
const MAX_ITEMS = local ? 80 : 30;
const MAX_WORDS = local ? 24 : 14;
const BLOCK_TYPES = new Set(['p', 'h', 'tip', 'list', 'table']);

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const words = (s) => s.split(/\s+/).filter((w) => w.replace(/[^\w']/g, ''));

let bookSentences = null;
if (bookPath) {
  const text = readFileSync(bookPath, 'utf8').replace(/\*\*|__|\*/g, '');
  bookSentences = new Set(
    text
      .split(/[.?!\n]+/)
      .map(norm)
      .filter((s) => s.split(' ').length >= 4),
  );
}

let errors = 0;
const fail = (id, msg) => {
  errors++;
  console.log(`lesson ${id}: ${msg}`);
};

for (let id = first; id <= last; id++) {
  const file = join(dir, `${String(id).padStart(3, '0')}.json`);
  if (!existsSync(file)) {
    fail(id, 'file is missing');
    continue;
  }
  let lesson;
  try {
    lesson = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    fail(id, `invalid JSON: ${e.message}`);
    continue;
  }
  if (lesson.id !== id) fail(id, `id is ${lesson.id}`);
  for (const key of ['title', 'subtitle', 'section']) {
    if (typeof lesson[key] !== 'string' || !lesson[key].trim()) fail(id, `${key} is empty`);
  }
  if (!Array.isArray(lesson.theory) || lesson.theory.length < 2) fail(id, 'theory needs at least 2 blocks');
  else
    lesson.theory.forEach((b, i) => {
      if (!BLOCK_TYPES.has(b.type)) fail(id, `theory[${i}] has unknown type ${b.type}`);
      if (['p', 'h', 'tip'].includes(b.type) && typeof b.text !== 'string') fail(id, `theory[${i}] needs text`);
      if (b.type === 'list' && !Array.isArray(b.items)) fail(id, `theory[${i}] needs items`);
      if (b.type === 'table' && (!Array.isArray(b.head) || !Array.isArray(b.rows))) fail(id, `theory[${i}] needs head and rows`);
      if (b.type === 'table' && b.rows?.some((r) => r.length !== b.head.length)) fail(id, `theory[${i}] row length differs from head`);
    });
  const items = lesson.items;
  if (!Array.isArray(items) || items.length < MIN_ITEMS || items.length > MAX_ITEMS) {
    fail(id, `needs ${MIN_ITEMS}-${MAX_ITEMS} items, has ${items?.length}`);
    continue;
  }
  const seenRu = new Set();
  items.forEach((item, i) => {
    const at = `item ${i + 1}`;
    if (typeof item.ru !== 'string' || !/[а-яё]/i.test(item.ru)) fail(id, `${at}: ru must be Russian text`);
    if (!Array.isArray(item.en) || item.en.length === 0 || item.en.some((e) => typeof e !== 'string' || !e.trim())) {
      fail(id, `${at}: en must be a non-empty list of strings`);
      return;
    }
    if (seenRu.has(item.ru)) fail(id, `${at}: duplicate ru "${item.ru}"`);
    seenRu.add(item.ru);
    item.en.forEach((e) => {
      if (/[а-яё]/i.test(e)) fail(id, `${at}: Cyrillic in English answer "${e}"`);
      if (/["“”«»;:()\[\]/]/.test(e)) fail(id, `${at}: unsupported punctuation in "${e}"`);
    });
    const ref = item.en[0];
    if (words(ref).length > MAX_WORDS) fail(id, `${at}: reference answer longer than ${MAX_WORDS} words`);
    if (new Set(item.en.map(norm)).size !== item.en.length) fail(id, `${at}: duplicate alternatives`);
    if (bookSentences && bookSentences.has(norm(ref))) fail(id, `${at}: copied from the book "${ref}"`);
  });
}

console.log(errors ? `\n${errors} problem(s)` : `lessons ${first}-${last}: OK`);
process.exit(errors ? 1 : 0);
