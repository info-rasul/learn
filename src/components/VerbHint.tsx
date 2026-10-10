import { conjugate, PRONOUNS, thirdPersonForm, VERBS, type Form, type Tense, type Verb } from '../lib/verbs';
import { tokens } from '../lib/check';

const TENSES: [Tense, string][] = [
  ['future', 'Будущее'],
  ['present', 'Настоящее'],
  ['past', 'Прошедшее'],
];
const FORMS: [Form, string][] = [
  ['question', '?'],
  ['positive', '+'],
  ['negative', '−'],
];

/** Finds the verb of the phrase (any of its forms) and the pronoun it is used with. */
export function findVerb(sentence: string): { verb: Verb; pronoun: string } | null {
  const words = tokens(sentence);
  const verb = VERBS.find((v) => {
    const forms = [v.base, v.past, thirdPersonForm(v.base)];
    return words.some((w) => forms.includes(w));
  });
  if (!verb) return null;
  const found = PRONOUNS.find((p) => words.includes(p.en.toLowerCase()));
  return { verb, pronoun: found ? found.en : 'I' };
}

export default function VerbHint({ verb, pronoun }: { verb: Verb; pronoun: string }) {
  return (
    <div className="verb-hint">
      <p className="muted">
        <b>{verb.base}</b> — {verb.ru}. Вторая форма: <b>{verb.past}</b>
      </p>
      <table className="verb-hint-table">
        <thead>
          <tr>
            <th />
            {FORMS.map(([form, label]) => (
              <th key={form}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TENSES.map(([tense, label]) => (
            <tr key={tense}>
              <th>{label}</th>
              {FORMS.map(([form]) => (
                <td key={form}>{conjugate(verb, pronoun, tense, form)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
