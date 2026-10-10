import { PASS_CORRECT, SCORE_WINDOW } from '../lib/scoring';

/** 100 cells for the last 100 answers in two rows, oldest first: green — correct, red — wrong, grey — not answered yet. */
export default function ResultStrip({ results = [] }: { results?: boolean[] }) {
  const last = results.slice(-SCORE_WINDOW);
  const correct = last.filter(Boolean).length;
  const wrong = last.length - correct;
  return (
    <div className="result-strip">
      <div className="result-strip-label">
        <span>
          Последние {SCORE_WINDOW}: <b>{correct}</b> верно · <b>{wrong}</b> ошибок
        </span>
        <span>нужно {PASS_CORRECT}</span>
      </div>
      <div
        className="result-strip-cells"
        role="img"
        aria-label={`Правильных ${correct} из последних ${SCORE_WINDOW}, ошибок ${wrong}`}
      >
        {Array.from({ length: SCORE_WINDOW }, (_, i) => {
          const ok = last[i];
          return <span key={i} className={ok === undefined ? 'cell' : ok ? 'cell ok' : 'cell bad'} />;
        })}
      </div>
    </div>
  );
}
