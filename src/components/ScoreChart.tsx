import { Link } from 'react-router-dom';
import type { Lesson, LessonResults } from '../types';
import { formatScore, isUnlocked, lessonScore, MAX_SCORE, PASS_SCORE } from '../lib/scoring';

interface Props {
  lessons: Lesson[];
  results: LessonResults;
  passed: number[];
}

/** Column per lesson: current score out of 5 with the 4.5 pass line. */
export default function ScoreChart({ lessons, results, passed }: Props) {
  const passLine = (PASS_SCORE / MAX_SCORE) * 100;
  return (
    <div className={lessons.length > 30 ? 'score-chart dense' : 'score-chart'}>
      <div className="score-chart-plot">
        <div className="score-chart-line" style={{ bottom: `${passLine}%` }}>
          <span>{formatScore(PASS_SCORE)}</span>
        </div>
        {lessons.map((lesson, i) => {
          const unlocked = isUnlocked(lessons, i, passed);
          const score = lessonScore(results[lesson.id]);
          const cls = ['score-col', passed.includes(lesson.id) && 'passed', !unlocked && 'locked']
            .filter(Boolean)
            .join(' ');
          return (
            <Link
              key={lesson.id}
              to={`/lesson/${lesson.id}`}
              className={cls}
              title={`Урок ${lesson.id}: ${formatScore(score)}`}
            >
              <span className="score-col-bar" style={{ height: `${(score / MAX_SCORE) * 100}%` }} />
            </Link>
          );
        })}
      </div>
      <div className="score-chart-axis">
        {lessons.map((lesson) => (
          <span key={lesson.id}>{lessons.length <= 30 || lesson.id === 1 || lesson.id % 20 === 0 ? lesson.id : ''}</span>
        ))}
      </div>
    </div>
  );
}
