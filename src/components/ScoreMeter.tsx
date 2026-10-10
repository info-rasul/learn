import { PASS_CORRECT, SCORE_WINDOW } from '../lib/scoring';

/** Bar of correct answers among the last 100 with a mark at the 4.5 pass line. */
export default function ScoreMeter({ correct }: { correct: number }) {
  const pct = Math.min(100, (correct / SCORE_WINDOW) * 100);
  const passPct = (PASS_CORRECT / SCORE_WINDOW) * 100;
  return (
    <div className={correct >= PASS_CORRECT ? 'score-meter passed' : 'score-meter'}>
      <div className="score-meter-fill" style={{ width: `${pct}%` }} />
      <div className="score-meter-mark" style={{ left: `${passPct}%` }} title="4,5 балла" />
    </div>
  );
}
