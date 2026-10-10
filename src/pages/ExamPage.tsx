import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ExamResult, Lesson } from '../types';
import { useLessons } from '../lib/content';
import { useUserData } from '../lib/userData';
import { shuffle } from '../lib/tiles';
import { formatScore, gradeOf, isUnlocked, PASS_SCORE } from '../lib/scoring';
import TaskScreen from '../components/TaskScreen';
import { CheckIcon, CrossIcon } from '../components/Practice';

const TASKS_PER_LESSON = 10;

interface Task {
  lessonId: number;
  index: number;
}

type Tally = Record<number, { correct: number; total: number }>;

type Phase = { name: 'setup' } | { name: 'running'; tasks: Task[] } | { name: 'done'; result: ExamResult };

export default function ExamPage() {
  const { lessons, error } = useLessons();
  const { passed, lastExam, saveExam, recordAttempt, settings } = useUserData();
  const [selected, setSelected] = useState<number[] | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: 'setup' });
  const [pos, setPos] = useState(0);
  const [tally, setTally] = useState<Tally>({});

  if (error) return <div className="error-box">{error}</div>;
  if (!lessons) return <div className="loading">Загрузка…</div>;

  const available = lessons.filter((_, i) => isUnlocked(lessons, i, passed));
  const chosen = selected ?? available.map((l) => l.id);
  const lessonById = (id: number) => lessons.find((l) => l.id === id) as Lesson;

  function toggle(id: number) {
    setSelected(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);
  }

  function start() {
    const tasks = shuffle(
      chosen.flatMap((lessonId) =>
        shuffle(lessonById(lessonId).items.map((_, index) => index))
          .slice(0, TASKS_PER_LESSON)
          .map((index) => ({ lessonId, index })),
      ),
    );
    setTally(Object.fromEntries(chosen.map((id) => [id, { correct: 0, total: 0 }])));
    setPos(0);
    setPhase({ name: 'running', tasks });
  }

  if (phase.name === 'running') {
    const task = phase.tasks[pos];
    const lesson = lessonById(task.lessonId);
    const item = lesson.items[task.index];

    const onChecked = (ok: boolean, answer: string) => {
      recordAttempt({
        lessonId: lesson.id,
        itemIndex: task.index,
        ru: item.ru,
        expected: item.en[0],
        answer,
        correct: ok,
        mode: settings.mode,
        exam: true,
      });
      setTally((t) => ({
        ...t,
        [lesson.id]: { correct: t[lesson.id].correct + (ok ? 1 : 0), total: t[lesson.id].total + 1 },
      }));
    };

    const onNext = () => {
      if (pos + 1 < phase.tasks.length) {
        setPos(pos + 1);
        return;
      }
      const result: ExamResult = {
        ts: Date.now(),
        perLesson: chosen.map((lessonId) => ({ lessonId, ...tally[lessonId] })),
      };
      saveExam(result);
      setPhase({ name: 'done', result });
    };

    const answered = Object.values(tally).reduce((s, t) => s + t.total, 0);
    const correct = Object.values(tally).reduce((s, t) => s + t.correct, 0);
    const abort = () => {
      if (confirm('Прервать экзамен? Результат не сохранится.')) setPhase({ name: 'setup' });
    };

    return (
      <TaskScreen
        key={pos}
        title="Экзамен"
        onBack={abort}
        stats={
          <>
            <span title="Задание">
              {pos + 1}/{phase.tasks.length}
            </span>
            <span title="Правильно">
              <CheckIcon /> {correct}
            </span>
            <span title="Ошибок">
              <CrossIcon /> {answered - correct}
            </span>
          </>
        }
        menu={[{ label: 'Прервать экзамен', danger: true, onSelect: abort }]}
        lesson={lesson}
        index={task.index}
        footer={
          <div className="exam-progress" title={`Урок ${lesson.id}. ${lesson.title}`}>
            <span style={{ width: `${(pos / phase.tasks.length) * 100}%` }} />
          </div>
        }
        onChecked={onChecked}
        onNext={onNext}
      />
    );
  }

  if (phase.name === 'done') {
    return (
      <div className="exam">
        <h1>Результат экзамена</h1>
        <ExamResultView result={phase.result} lessonById={lessonById} />
        <div className="row">
          <button type="button" className="btn" onClick={start}>
            Пройти ещё раз
          </button>
          <button type="button" className="btn-ghost" onClick={() => setPhase({ name: 'setup' })}>
            Выбрать другие уроки
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="exam">
      <h1>Экзамен</h1>
      <p className="muted">
        По каждому выбранному уроку — {TASKS_PER_LESSON} заданий, все задания перемешаны. В конце — общая оценка и
        оценка по каждому уроку. Ответы экзамена не меняют баллы уроков.
      </p>

      <section className="panel">
        <div className="exam-select-head">
          <h2>Уроки</h2>
          <button
            type="button"
            className="link-btn"
            onClick={() => setSelected(chosen.length === available.length ? [] : available.map((l) => l.id))}
          >
            {chosen.length === available.length ? 'Снять все' : 'Выбрать все'}
          </button>
        </div>
        <div className="exam-lessons">
          {available.map((l) => (
            <label key={l.id} className="check">
              <input type="checkbox" checked={chosen.includes(l.id)} onChange={() => toggle(l.id)} />
              {l.id}. {l.title}
            </label>
          ))}
        </div>
        {available.length < lessons.length && (
          <p className="muted small">Закрытые уроки появятся здесь, когда вы их откроете.</p>
        )}
        <button type="button" className="btn wide" onClick={start} disabled={chosen.length === 0}>
          Начать экзамен ({chosen.length * TASKS_PER_LESSON} заданий)
        </button>
      </section>

      {lastExam && (
        <section className="panel">
          <h2>Прошлый экзамен</h2>
          <div className="muted small">{new Date(lastExam.ts).toLocaleString('ru-RU')}</div>
          <ExamResultView result={lastExam} lessonById={lessonById} />
        </section>
      )}
    </div>
  );
}

function ExamResultView({ result, lessonById }: { result: ExamResult; lessonById: (id: number) => Lesson }) {
  const correct = result.perLesson.reduce((s, r) => s + r.correct, 0);
  const total = result.perLesson.reduce((s, r) => s + r.total, 0);
  const overall = gradeOf(correct, total);
  return (
    <div className="exam-result">
      <div className={overall >= PASS_SCORE ? 'exam-grade good' : 'exam-grade'}>
        <b>{formatScore(overall)}</b>
        <span>
          общая оценка · {correct} из {total}
        </span>
      </div>
      <ul className="exam-rows">
        {result.perLesson.map((r) => {
          const grade = gradeOf(r.correct, r.total);
          const lesson = lessonById(r.lessonId);
          return (
            <li key={r.lessonId}>
              <span className="exam-row-title">
                {lesson.id}. {lesson.title}
              </span>
              <span className={grade >= PASS_SCORE ? 'score-badge good' : 'score-badge weak'}>{formatScore(grade)}</span>
              {grade < PASS_SCORE && (
                <Link className="small" to={`/lesson/${lesson.id}/practice`}>
                  потренироваться
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
