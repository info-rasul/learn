export interface Verb {
  base: string;
  past: string;
  ru: string;
}

export const VERBS: Verb[] = [
  { base: 'love', past: 'loved', ru: 'любить' },
  { base: 'live', past: 'lived', ru: 'жить' },
  { base: 'work', past: 'worked', ru: 'работать' },
  { base: 'start', past: 'started', ru: 'начинать' },
  { base: 'finish', past: 'finished', ru: 'заканчивать' },
  { base: 'open', past: 'opened', ru: 'открывать' },
  { base: 'close', past: 'closed', ru: 'закрывать' },
  { base: 'help', past: 'helped', ru: 'помогать' },
  { base: 'want', past: 'wanted', ru: 'хотеть' },
  { base: 'ask', past: 'asked', ru: 'спрашивать' },
  { base: 'answer', past: 'answered', ru: 'отвечать' },
  { base: 'study', past: 'studied', ru: 'изучать' },
  { base: 'travel', past: 'travelled', ru: 'путешествовать' },
  { base: 'think', past: 'thought', ru: 'думать' },
  { base: 'come', past: 'came', ru: 'приходить' },
  { base: 'go', past: 'went', ru: 'идти, ехать' },
  { base: 'see', past: 'saw', ru: 'видеть' },
  { base: 'know', past: 'knew', ru: 'знать' },
  { base: 'understand', past: 'understood', ru: 'понимать' },
  { base: 'speak', past: 'spoke', ru: 'говорить' },
  { base: 'give', past: 'gave', ru: 'давать' },
  { base: 'take', past: 'took', ru: 'брать' },
  { base: 'buy', past: 'bought', ru: 'покупать' },
  { base: 'write', past: 'wrote', ru: 'писать' },
  { base: 'read', past: 'read', ru: 'читать' },
  { base: 'do', past: 'did', ru: 'делать' },
  { base: 'have', past: 'had', ru: 'иметь' },
];

export const PRONOUNS = [
  { en: 'I', ru: 'я' },
  { en: 'you', ru: 'ты / вы' },
  { en: 'he', ru: 'он' },
  { en: 'she', ru: 'она' },
  { en: 'it', ru: 'оно' },
  { en: 'we', ru: 'мы' },
  { en: 'they', ru: 'они' },
];

export type Tense = 'past' | 'present' | 'future';
export type Form = 'question' | 'positive' | 'negative';

const isThirdPerson = (pronoun: string) => pronoun === 'he' || pronoun === 'she' || pronoun === 'it';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function thirdPersonForm(v: string): string {
  if (v === 'have') return 'has';
  if (/(s|sh|ch|x|z|o)$/.test(v)) return `${v}es`;
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ies`;
  return `${v}s`;
}

export function conjugate(verb: Verb, pronoun: string, tense: Tense, form: Form): string {
  const p = pronoun;
  const third = isThirdPerson(p);
  const v = verb.base;
  if (tense === 'present') {
    if (form === 'question') return `${third ? 'Does' : 'Do'} ${p} ${v}?`;
    if (form === 'negative') return `${cap(p)} ${third ? "doesn't" : "don't"} ${v}`;
    return `${cap(p)} ${third ? thirdPersonForm(v) : v}`;
  }
  if (tense === 'past') {
    if (form === 'question') return `Did ${p} ${v}?`;
    if (form === 'negative') return `${cap(p)} didn't ${v}`;
    return `${cap(p)} ${verb.past}`;
  }
  if (form === 'question') return `Will ${p} ${v}?`;
  if (form === 'negative') return `${cap(p)} won't ${v}`;
  return `${cap(p)} will ${v}`;
}
