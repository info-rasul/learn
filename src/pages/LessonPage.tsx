import { Link, useParams } from 'react-router-dom';
import { useLessons } from '../lib/content';
import { useUserData } from '../lib/userData';
import { formatScore, isUnlocked, lessonScore, PASS_SCORE } from '../lib/scoring';
import Theory from '../components/Theory';
import Practice from '../components/Practice';

type View = 'menu' | 'theory' | 'practice';

export default function LessonPage({ view = 'menu' }: { view?: View }) {
  const { id } = useParams();
  const { lessons, error } = useLessons();
  const { results, passed } = useUserData();

  if (error) return <div className="error-box">{error}</div>;
  if (!lessons) return <div className="loading">Загрузка…</div>;

  const index = lessons.findIndex((l) => l.id === Number(id));
  if (index === -1) {
    return (
      <div className="error-box">
        Урок не найден. <Link to="/">К списку уроков</Link>
      </div>
    );
  }
  const lesson = lessons[index];
  const nextLesson = lessons[index + 1] ?? null;

  if (!isUnlocked(lessons, index, passed)) {
    const prev = lessons[index - 1];
    return (
      <div className="locked-lesson">
        <h1>
          Урок {lesson.id}. {lesson.title}
        </h1>
        <p>
          Урок пока закрыт. Он откроется, когда в уроке {prev.id} «{prev.title}» будет {formatScore(PASS_SCORE)} балла —
          90 правильных ответов из последних 100. Сейчас там {formatScore(lessonScore(results[prev.id]))}.
        </p>
        <Link className="btn" to={`/lesson/${prev.id}/practice`}>
          Тренировать урок {prev.id}
        </Link>
      </div>
    );
  }

  if (view === 'practice') return <Practice key={lesson.id} lesson={lesson} nextLesson={nextLesson} />;

  if (view === 'theory') {
    return (
      <div className="lesson">
        <Link to={`/lesson/${lesson.id}`} className="back-link">
          ← Урок {lesson.id}
        </Link>
        <h1>{lesson.title}</h1>
        <p className="muted">{lesson.subtitle}</p>
        <Theory blocks={lesson.theory} />
        <div className="lesson-footer">
          <Link className="btn wide" to={`/lesson/${lesson.id}/practice`}>
            К заданиям
          </Link>
        </div>
      </div>
    );
  }

  const score = lessonScore(results[lesson.id]);
  const done = passed.includes(lesson.id);

  return (
    <div className="lesson-menu">
      <Link to="/" className="back-link">
        ← Уроки
      </Link>
      <div className="lesson-menu-head">
        <span className="muted">Урок {lesson.id}</span>
        <h1>{lesson.title}</h1>
        <span className="muted">{lesson.subtitle}</span>
      </div>
      <ul className="lesson-menu-list">
        <li>
          <Link to={`/lesson/${lesson.id}/practice`}>
            <span className={done ? 'menu-badge good' : 'menu-badge'}>{formatScore(score)}</span>
            <span className="menu-label">
              {results[lesson.id]?.length ? 'Продолжить урок' : 'Начать урок'}
              <span className="muted small">
                {done ? 'урок пройден' : `для следующего урока нужно ${formatScore(PASS_SCORE)}`}
              </span>
            </span>
            <span className="menu-arrow">›</span>
          </Link>
        </li>
        <li>
          <Link to={`/lesson/${lesson.id}/theory`}>
            <span className="menu-badge plain">≡?</span>
            <span className="menu-label">Описание урока</span>
            <span className="menu-arrow">›</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
