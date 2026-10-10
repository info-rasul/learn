import type { LessonItem } from '../types';
import { shuffle, splitWords, tileWord } from './tiles';
import { thirdPersonForm, VERBS } from './verbs';

/** How many options are offered for each next word. */
export const OPTIONS_PER_STEP = 8;

/** Words that are easy to confuse with each other — they make the best distractors. */
const GROUPS: string[][] = [
  ['I', 'you', 'he', 'she', 'it', 'we', 'they'],
  ['me', 'you', 'him', 'her', 'it', 'us', 'them'],
  ['my', 'your', 'his', 'her', 'its', 'our', 'their'],
  ['do', 'does', 'did', 'will', "don't", "doesn't", "didn't", "won't"],
  ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'will'],
  ["isn't", "aren't", "wasn't", "weren't", "don't", "doesn't"],
  ['can', 'could', 'must', 'should', 'may', "can't", "mustn't", "shouldn't"],
  ['have', 'has', 'had', "haven't", "hasn't"],
  ['what', 'where', 'when', 'why', 'who', 'how', 'which', 'whose'],
  ['a', 'an', 'the'],
  ['in', 'on', 'at', 'to', 'into', 'from', 'under', 'near', 'behind', 'for', 'with', 'by', 'of'],
  ['this', 'that', 'these', 'those'],
  ['much', 'many', 'some', 'any', 'no', 'few', 'little', 'a lot'],
  ['there', 'here'],
  ['not', 'no', 'never'],
];

function ingForm(v: string): string {
  if (/ie$/.test(v)) return `${v.slice(0, -2)}ying`;
  if (/[^e]e$/.test(v)) return `${v.slice(0, -1)}ing`;
  return `${v}ing`;
}

const VERB_FORMS: string[][] = VERBS.map((v) => [v.base, v.past, thirdPersonForm(v.base), ingForm(v.base)]);

const lower = (w: string) => (w === 'I' || w.startsWith("I'") ? w : w.toLowerCase());

function relatedWords(word: string): string[] {
  const w = word.toLowerCase();
  const related: string[] = [];
  for (const group of GROUPS) if (group.some((g) => g.toLowerCase() === w)) related.push(...group);
  for (const forms of VERB_FORMS) if (forms.includes(w)) related.push(...forms);
  return related;
}

/**
 * Options for every position of the reference answer: the right word plus look-alikes
 * (same grammar group or other forms of the same verb), topped up with words from the lesson.
 */
export function buildSteps(items: LessonItem[], index: number): { answer: string[]; options: string[][] } {
  const answer = splitWords(items[index].en[0]).map((w, i) => tileWord(w, i === 0));
  const lessonWords = new Set<string>();
  items.forEach((item) => splitWords(item.en[0]).forEach((w, i) => lessonWords.add(lower(tileWord(w, i === 0)))));

  const options = answer.map((word) => {
    const picked = new Map<string, string>([[word.toLowerCase(), word]]);
    const add = (candidates: string[]) => {
      for (const c of shuffle(candidates)) {
        if (picked.size >= OPTIONS_PER_STEP) return;
        if (c.includes(' ')) continue;
        const key = c.toLowerCase();
        if (!picked.has(key)) picked.set(key, lower(c));
      }
    };
    add(relatedWords(word));
    add([...lessonWords]);
    return shuffle([...picked.values()]);
  });

  return { answer, options };
}
