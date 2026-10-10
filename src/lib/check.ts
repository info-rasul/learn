const CONTRACTIONS: [RegExp, string][] = [
  [/\bwon't\b/g, 'will not'],
  [/\bcan't\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bshan't\b/g, 'shall not'],
  [/n't\b/g, ' not'],
  [/\blet's\b/g, 'let us'],
  [/\b(he|she|it|that|what|who|where|there|here|how)'s\b/g, '$1 is'],
  [/'m\b/g, ' am'],
  [/'re\b/g, ' are'],
  [/'ll\b/g, ' will'],
  [/'ve\b/g, ' have'],
  [/'d\b/g, ' would'],
];

/** Lowercase, expand contractions and strip punctuation so that "I don't" equals "i do not". */
export function normalize(text: string): string {
  let t = text.toLowerCase().replace(/[’‘`]/g, "'");
  for (const [re, replacement] of CONTRACTIONS) t = t.replace(re, replacement);
  return t
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const tokens = (text: string) => normalize(text).split(' ').filter(Boolean);

export function isCorrect(answer: string, expected: string[]): boolean {
  const n = normalize(answer);
  return n.length > 0 && expected.some((e) => normalize(e) === n);
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
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ type: 'same', word: a[i] });
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
