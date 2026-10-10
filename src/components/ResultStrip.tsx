import { SCORE_WINDOW } from '../lib/scoring';

/** 100 cells for the last 100 answers, oldest on the left: green — correct, red — wrong, grey — not answered yet. */
export default function ResultStrip({ results = [] }: { results?: boolean[] }) {
  const last = results.slice(-SCORE_WINDOW);
  const correct = last.filter(Boolean).length;
  return (
    <div
      className="result-strip"
      role="img"
      aria-label={`Правильных ${correct} из последних ${SCORE_WINDOW}, ошибок ${last.length - correct}`}
      title={`${correct} верно · ${last.length - correct} ошибок · нужно 90 из ${SCORE_WINDOW}`}
    >
      {Array.from({ length: SCORE_WINDOW }, (_, i) => {
        const ok = last[i];
        return <span key={i} className={ok === undefined ? 'cell' : ok ? 'cell ok' : 'cell bad'} />;
      })}
    </div>
  );
}
