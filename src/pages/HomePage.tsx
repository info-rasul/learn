import { Link } from 'react-router-dom';
import type { Lesson, LessonResults } from '../types';
import { useLessons } from '../lib/content';
import { useUserData } from '../lib/userData';
import { correctCount, formatScore, isUnlocked, lessonScore, PASS_SCORE } from '../lib/scoring';
import { groupBySection } from '../lib/sections';
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
        <h1>Грамматика Мёрфи по методу «Полиглот»</h1>
        <p className="muted">
          {lessons.length} уроков по разделам English Grammar in Use. Следующий урок открывается, когда в предыдущем
          набрано {formatScore(PASS_SCORE)} балла — это 90 правильных ответов из последних 100.
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

      {groupBySection(lessons).map((section) => {
        const done = section.lessons.filter((l) => passed.includes(l.id)).length;
        const first = section.lessons[0].id;
        const last = section.lessons[section.lessons.length - 1].id;
        return (
          <details key={section.name} className="home-section" open={section.lessons.includes(current)}>
            <summary>
              <span className="home-section-name">{section.name}</span>
              <span className="muted small nowrap">
                {first === last ? `урок ${first}` : `уроки ${first}–${last}`} · {done}/{section.lessons.length}
              </span>
            </summary>
            <div className="lesson-grid">
              {section.lessons.map((lesson) => (
                <LessonCard key={lesson.id} lessons={lessons} lesson={lesson} results={results} passed={passed} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function LessonCard({
  lessons,
  lesson,
  results,
  passed,
}: {
  lessons: Lesson[];
  lesson: Lesson;
  results: LessonResults;
  passed: number[];
}) {
  const i = lessons.indexOf(lesson);
  const unlocked = isUnlocked(lessons, i, passed);
  const done = passed.includes(lesson.id);
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
            <span className="score-badge">{formatScore(lessonScore(results[lesson.id]))}</span>
          </span>
        ) : (
          <span className="lesson-locked-note">
            Откроется после {formatScore(PASS_SCORE)} балла в уроке {lessons[i - 1].id}
          </span>
        )}
      </span>
    </>
  );
  return unlocked ? (
    <Link to={`/lesson/${lesson.id}`} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className} aria-disabled="true">
      {content}
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
