import { diffWords } from '../lib/check';

export default function DiffView({ answer, expected }: { answer: string; expected: string }) {
  const ops = diffWords(answer, expected);
  const hasExtra = ops.some((op) => op.type === 'extra');
  const hasMissing = ops.some((op) => op.type === 'missing');
  return (
    <div className="diff">
      <div className="diff-line">
        {ops.map((op, i) => (
          <span key={i} className={`diff-word ${op.type}`} title={titles[op.type]}>
            {op.word}
          </span>
        ))}
      </div>
      <div className="diff-legend">
        {hasExtra && <span className="diff-word extra">лишнее</span>}
        {hasMissing && <span className="diff-word missing">пропущено</span>}
      </div>
    </div>
  );
}

const titles = {
  same: 'Верно',
  extra: 'Лишнее или неверное слово',
  missing: 'Пропущенное слово',
};
