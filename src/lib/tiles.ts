import type { LessonItem } from '../types';

export interface Tile {
  id: number;
  word: string;
}

const KEEP_CASE = new RegExp(
  '^(' +
    [
      "I|I'm|I'll|I've|I'd|TV|OK",
      'Tom|Anna|Kate|Mike|Sarah|Paul|Lisa|John|Emma|Alex|Ben|Nick|Helen|Jack|Mary|Dan|Kevin|Jane|David|Laura',
      'London|Paris|Moscow|Rome|Berlin|Spain|Italy|France|Germany|Japan|Canada|Australia|England|America|China',
      'English|Russian|Spanish|French|Italian|Chinese|German|Japanese',
      'Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday',
      'January|February|March|April|June|July|August|September|October|November|December|Christmas',
    ].join('|') +
    ")('s)?$",
);

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

export const keepsCase = (word: string) => KEEP_CASE.test(word);

export function tileWord(word: string, isFirst: boolean): string {
  return isFirst && !keepsCase(word) ? word.charAt(0).toLowerCase() + word.slice(1) : word;
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
