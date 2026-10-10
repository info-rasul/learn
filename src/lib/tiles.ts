import type { LessonItem } from '../types';

export interface Tile {
  id: number;
  word: string;
}

const KEEP_CASE = /^(I|I'm|I'll|I've|I'd|Moscow|London|Paris|America|English|Russian|Chinese|China|Monday|TV|OK)$/;

export function shuffle<T>(items: T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function splitWords(sentence: string): string[] {
  return sentence
    .split(/\s+/)
    .map((w) => w.replace(/^[^\w']+|[^\w']+$/g, ''))
    .filter(Boolean);
}

export function tileWord(word: string, isFirst: boolean): string {
  return isFirst && !KEEP_CASE.test(word) ? word.charAt(0).toLowerCase() + word.slice(1) : word;
}

/** Words of the reference answer plus a few distractors taken from other phrases of the same lesson. */
export function buildTiles(items: LessonItem[], index: number): Tile[] {
  const words = splitWords(items[index].en[0]).map((w, i) => tileWord(w, i === 0));
  const used = new Set(words.map((w) => w.toLowerCase()));
  const pool = new Set<string>();
  items.forEach((item, j) => {
    if (j === index) return;
    splitWords(item.en[0]).forEach((w, i) => {
      const t = tileWord(w, i === 0);
      if (!used.has(t.toLowerCase())) pool.add(t);
    });
  });
  const extraCount = Math.min(4, Math.max(2, Math.ceil(words.length / 2)));
  const extras = shuffle([...pool]).slice(0, extraCount);
  return shuffle([...words, ...extras]).map((word, id) => ({ id, word }));
}

export function joinTiles(words: string[]): string {
  const text = words.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
