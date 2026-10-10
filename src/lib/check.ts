const CONTRACTIONS: [RegExp, string][] = [
  [/\bwon't\b/g, 'will not'],
  [/\bcan't\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bshan't\b/g, 'shall not'],
  [/n't\b/g, ' not'],
  [/\blet's\b/g, 'let us'],
  [/\b(he|she|it|that|what|who|where|there|here|how|everyone|everybody|nobody|nothing)'s\b/g, "$1 's"],
  [/'m\b/g, ' am'],
  [/'re\b/g, ' are'],
  [/'ll\b/g, ' will'],
  [/'ve\b/g, ' have'],
  [/\b(i|you|he|she|it|we|they|that|there|who)'d\b/g, "$1 'd"],
];

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
  'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** Spells 0–99 as words so that "5" equals "five"; larger numbers stay as digits. */
function numberToWords(digits: string): string {
  const n = Number(digits);
  if (n < 20) return ONES[n];
  if (n < 100) return n % 10 ? `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}` : TENS[n / 10];
  return digits;
}

const SPELLING: [RegExp, string][] = [
  [/\banymore\b/g, 'any more'],
  [/\bok\b/g, 'okay'],
];

/** Short forms that stand for more than one full word: 's = is/has, 'd = had/would. */
const AMBIGUOUS: Record<string, string[]> = { "'s": ['is', 'has'], "'d": ['had', 'would'] };

const sameWord = (a: string, b: string) =>
  a === b || (AMBIGUOUS[a]?.includes(b) ?? false) || (AMBIGUOUS[b]?.includes(a) ?? false);

/**
 * Lowercase, expand contractions and strip punctuation so that "I don't" equals "i do not".
 * Ambiguous short forms stay as the tokens 's and 'd and match either full word.
 */
export function normalize(text: string): string {
  let t = text.toLowerCase().replace(/[’‘`]/g, "'");
  for (const [re, replacement] of CONTRACTIONS) t = t.replace(re, replacement);
  for (const [re, replacement] of SPELLING) t = t.replace(re, replacement);
  return t
    .replace(/\b\d+\b/g, numberToWords)
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const tokens = (text: string) => normalize(text).split(' ').filter(Boolean);

export function sameAnswer(a: string, b: string): boolean {
  const x = tokens(a);
  const y = tokens(b);
  return x.length > 0 && x.length === y.length && x.every((w, i) => sameWord(w, y[i]));
}

export function isCorrect(answer: string, expected: string[]): boolean {
  return expected.some((e) => sameAnswer(answer, e));
}

export interface DiffOp {
  type: 'same' | 'extra' | 'missing';
  word: string;
}

/** Word-level LCS diff: "extra" words are in the answer only, "missing" ones only in the reference. */
export function diffWords(answer: string, expected: string): DiffOp[] {
  const a = tokens(answer);
  const b = tokens(expected);
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = sameWord(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (sameWord(a[i], b[j])) {
      ops.push({ type: 'same', word: b[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'extra', word: a[i++] });
    } else {
      ops.push({ type: 'missing', word: b[j++] });
    }
  }
  while (i < a.length) ops.push({ type: 'extra', word: a[i++] });
  while (j < b.length) ops.push({ type: 'missing', word: b[j++] });
  return ops;
}

/** The accepted answer that needs the fewest word edits to match what the user wrote. */
export function closestAnswer(answer: string, expected: string[]): string {
  let best = expected[0];
  let bestCost = Infinity;
  for (const e of expected) {
    const cost = diffWords(answer, e).filter((op) => op.type !== 'same').length;
    if (cost < bestCost) {
      best = e;
      bestCost = cost;
    }
  }
  return best;
}
