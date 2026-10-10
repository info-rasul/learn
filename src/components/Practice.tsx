import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Lesson } from '../types';
import { useUserData } from '../lib/userData';
import { shuffle } from '../lib/tiles';
import { formatScore, isPassing, lessonScore, PASS_SCORE, pushResult } from '../lib/scoring';
import TaskScreen from './TaskScreen';
import ResultStrip from './ResultStrip';

/** A wrong phrase comes back after this many other phrases. */
const RETRY_GAP = 3;

function newDeck(size: number, avoidFirst?: number): number[] {
  const deck = shuffle(Array.from({ length: size }, (_, i) => i));
  if (deck.length > 1 && deck[0] === avoidFirst) [deck[0], deck[1]] = [deck[1], deck[0]];
  return deck;
}

interface Props {
  lesson: Lesson;
  nextLesson: Lesson | null;
}

/** Endless practice, as in the original app: phrases keep coming, the score is taken from the last 100 answers. */
export default function Practice({ lesson, nextLesson }: Props) {
  const navigate = useNavigate();
  const { results, passed, settings, recordAttempt, resetLesson } = useUserData();
  const [deck, setDeck] = useState<number[]>(() => newDeck(lesson.items.length));
  const [taskKey, setTaskKey] = useState(0);
  const [session, setSession] = useState({ correct: 0, wrong: 0 });
  const [justPassed, setJustPassed] = useState(false);
  const lastWrong = useRef(false);

  const lessonResults = results[lesson.id];
  const isPassed = passed.includes(lesson.id);
  const current = deck[0];

  function onChecked(ok: boolean, answer: string) {
    const item = lesson.items[current];
    recordAttempt({
      lessonId: lesson.id,
      itemIndex: current,
      ru: item.ru,
      expected: item.en[0],
      answer,
      correct: ok,
      mode: settings.mode,
    });
    setSession((s) => (ok ? { ...s, correct: s.correct + 1 } : { ...s, wrong: s.wrong + 1 }));
    if (!isPassed && isPassing(pushResult(lessonResults, ok))) setJustPassed(true);
    lastWrong.current = !ok;
  }

  function onNext() {
    setDeck((prev) => {
      const [head, ...rest] = prev;
      const next = [...rest];
      if (lastWrong.current) next.splice(Math.min(RETRY_GAP, next.length), 0, head);
      return next.length ? next : newDeck(lesson.items.length, head);
    });
    setTaskKey((k) => k + 1);
  }

  const notice = justPassed && (
    <div className="unlock-banner">
      <button type="button" className="unlock-close" aria-label="Скрыть" onClick={() => setJustPassed(false)}>
        ×
      </button>
      <b>Урок пройден — {formatScore(PASS_SCORE)} балла!</b>
      {nextLesson ? (
        <span>
          Открыт урок {nextLesson.id} «{nextLesson.title}». <Link to={`/lesson/${nextLesson.id}`}>Перейти</Link>
        </span>
      ) : (
        <span>
          Это последний урок курса. Проверьте себя на <Link to="/exam">экзамене</Link>.
        </span>
      )}
    </div>
  );

  return (
    <TaskScreen
      key={taskKey}
      title={`Урок ${lesson.id}`}
      backTo={`/lesson/${lesson.id}`}
      stats={
        <>
          <span title="Балл урока из 5">
            <StarIcon /> {formatScore(lessonScore(lessonResults))}
          </span>
          <span title="Правильно за занятие">
            <CheckIcon /> {session.correct}
          </span>
          <span title="Ошибок за занятие">
            <CrossIcon /> {session.wrong}
          </span>
        </>
      }
      menu={[
        { label: 'Описание урока', onSelect: () => navigate(`/lesson/${lesson.id}/theory`) },
        {
          label: 'Обнулить балл урока',
          danger: true,
          onSelect: () => {
            if (confirm('Обнулить балл этого урока? Открытые уроки останутся открытыми.')) resetLesson(lesson.id);
          },
        },
      ]}
      lesson={lesson}
      index={current}
      notice={notice}
      footer={<ResultStrip results={lessonResults} />}
      onChecked={onChecked}
      onNext={onNext}
    />
  );
}

export function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="stat-icon" aria-hidden="true">
      <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="stat-icon" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.8 2.8L16 10" />
    </svg>
  );
}

export function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" className="stat-icon" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}
