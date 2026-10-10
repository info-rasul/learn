import { Link } from 'react-router-dom';
import { useLessons } from '../lib/content';
import { useUserData } from '../lib/userData';
import { correctCount, formatScore, isUnlocked, lessonScore, PASS_SCORE } from '../lib/scoring';
import ScoreMeter from '../components/ScoreMeter';

export default function HomePage() {
  const { lessons, error } = useLessons();
  const { results, passed } = useUserData();

  if (error) return <div className="error-box">{error}</div>;
  if (!lessons) return <div className="loading">Загрузка уроков…</div>;

  const passedCount = lessons.filter((l) => passed.includes(l.id)).length;
  const current =
    lessons.find((l, i) => isUnlocked(lessons, i, passed) && !passed.includes(l.id)) ?? lessons[lessons.length - 1];

  return (
    <div className="home">
      <section className="hero">
        <h1>Английский за 16 уроков</h1>
        <p className="muted">
          Следующий урок открывается, когда в предыдущем набрано {formatScore(PASS_SCORE)} балла — это 90 правильных
          ответов из последних 100.
        </p>
        <div className="hero-progress">
          <div className="progress">
            <div className="progress-fill" style={{ width: `${(passedCount / lessons.length) * 100}%` }} />
          </div>
          <span className="muted small nowrap">
            пройдено {passedCount} из {lessons.length}
          </span>
        </div>
        <div className="row">
          <Link className="btn" to={`/lesson/${current.id}/practice`}>
            {passedCount === 0 && !results[current.id] ? 'Начать обучение' : `Продолжить: урок ${current.id}`}
          </Link>
          {passedCount > 0 && (
            <Link className="btn-ghost" to="/exam">
              Экзамен
            </Link>
          )}
        </div>
      </section>

      <div className="lesson-grid">
        {lessons.map((lesson, i) => {
          const unlocked = isUnlocked(lessons, i, passed);
          const done = passed.includes(lesson.id);
          const score = lessonScore(results[lesson.id]);
          const className = ['lesson-card', done && 'complete', !unlocked && 'locked'].filter(Boolean).join(' ');
          const content = (
            <>
              <span className="lesson-num">{done ? '✓' : unlocked ? lesson.id : <LockIcon />}</span>
              <span className="lesson-info">
                <span className="lesson-title">
                  {lesson.id}. {lesson.title}
                </span>
                <span className="lesson-sub">{lesson.subtitle}</span>
                {unlocked ? (
                  <span className="lesson-progress">
                    <ScoreMeter correct={correctCount(results[lesson.id])} />
                    <span className="score-badge">{formatScore(score)}</span>
                  </span>
                ) : (
                  <span className="lesson-locked-note">Откроется после {formatScore(PASS_SCORE)} балла в уроке {lessons[i - 1].id}</span>
                )}
              </span>
            </>
          );
          return unlocked ? (
            <Link key={lesson.id} to={`/lesson/${lesson.id}`} className={className}>
              {content}
            </Link>
          ) : (
            <div key={lesson.id} className={className} aria-disabled="true">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="lock-icon" aria-label="Заблокирован">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
