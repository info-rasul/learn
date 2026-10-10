import { useState } from 'react';
import { conjugate, PRONOUNS, VERBS, type Form, type Tense } from '../lib/verbs';
import { speak } from '../lib/speech';
import { useUserData } from '../lib/userData';

const TENSES: { id: Tense; label: string }[] = [
  { id: 'past', label: 'Прошлое' },
  { id: 'present', label: 'Настоящее' },
  { id: 'future', label: 'Будущее' },
];

const FORMS: { id: Form; label: string }[] = [
  { id: 'question', label: '?' },
  { id: 'positive', label: '+' },
  { id: 'negative', label: '−' },
];

export default function VerbTablePage() {
  const { settings } = useUserData();
  const [verbIndex, setVerbIndex] = useState(0);
  const [pronoun, setPronoun] = useState('I');
  const verb = VERBS[verbIndex];

  return (
    <div className="verb-page">
      <h1>Таблица глагола</h1>
      <p className="muted">
        Основа всего курса: 3 времени × 3 формы. Выберите глагол и местоимение, нажмите на клетку — фраза прозвучит.
      </p>

      <div className="verb-controls">
        <label className="field">
          <span>Глагол</span>
          <select value={verbIndex} onChange={(e) => setVerbIndex(Number(e.target.value))}>
            {VERBS.map((v, i) => (
              <option key={v.base} value={i}>
                {v.base} — {v.ru}
              </option>
            ))}
          </select>
        </label>
        <div className="chips">
          {PRONOUNS.map((p) => (
            <button
              key={p.en}
              type="button"
              className={p.en === pronoun ? 'chip active' : 'chip'}
              onClick={() => setPronoun(p.en)}
              title={p.ru}
            >
              {p.en}
            </button>
          ))}
        </div>
      </div>

      <div className="verb-grid">
        <div className="verb-corner" />
        {TENSES.map((t) => (
          <div key={t.id} className="verb-th">
            {t.label}
          </div>
        ))}
        {FORMS.map((f) => (
          <FormRow key={f.id} form={f} onSpeak={(text) => speak(text, settings.speechRate)} pronoun={pronoun} verbIndex={verbIndex} />
        ))}
      </div>

      <p className="muted small">
        Прошедшая форма: <b>{verb.base}</b> → <b>{verb.past}</b>
        {verb.past.endsWith('ed') ? ' (правильный глагол)' : ' (неправильный глагол — запомните)'}
      </p>
    </div>
  );
}

function FormRow({
  form,
  pronoun,
  verbIndex,
  onSpeak,
}: {
  form: { id: Form; label: string };
  pronoun: string;
  verbIndex: number;
  onSpeak: (text: string) => void;
}) {
  return (
    <>
      <div className={`verb-form ${form.id}`}>{form.label}</div>
      {TENSES.map((t) => {
        const text = conjugate(VERBS[verbIndex], pronoun, t.id, form.id);
        return (
          <button key={t.id} type="button" className={`verb-cell ${form.id}`} onClick={() => onSpeak(text)}>
            {text}
          </button>
        );
      })}
    </>
  );
}
