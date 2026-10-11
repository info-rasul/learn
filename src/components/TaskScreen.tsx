import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Lesson } from '../types';
import { useUserData } from '../lib/userData';
import { buildTiles, joinTiles, splitWords, type Tile } from '../lib/tiles';
import { closestAnswer, isCorrect, normalize, sameAnswer } from '../lib/check';
import { speak } from '../lib/speech';
import { listen, listenAvailable } from '../lib/listen';
import SpeakButton from './SpeakButton';
import DiffView from './DiffView';
import AiExplain from './AiExplain';
import AskTutor from './AskTutor';
import Theory from './Theory';
import VerbHint, { findVerb } from './VerbHint';
import WordList from './WordList';

type Status = 'answer' | 'correct' | 'wrong';
type Sheet = 'hint' | 'help' | 'ask' | null;

const SHEET_TITLES: Record<'hint' | 'ask', string> = { hint: 'Подсказка', ask: 'Вопрос DeepSeek' };

const PRAISE = ['Правильно!', 'Отлично!', 'Молодец!', 'Верно!', 'Так держать!', 'Превосходно!'];
/** A correct answer moves on by itself after this delay (time to hear it). */
const AUTO_NEXT_MS = 1800;

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

interface Props {
  title: string;
  /** Where the back arrow leads; `onBack` takes precedence (e.g. to confirm leaving an exam). */
  backTo?: string;
  onBack?: () => void;
  /** Counters on the right of the top bar. */
  stats: ReactNode;
  menu?: MenuItem[];
  lesson: Lesson;
  index: number;
  /** Shown above the bottom toolbar, e.g. the strip of the last 100 answers. */
  footer?: ReactNode;
  notice?: ReactNode;
  /** Free questions to DeepSeek; off in the exam, where they would give answers away. */
  allowAsk?: boolean;
  onChecked: (correct: boolean, answer: string) => void;
  onNext: () => void;
}

/** Full-screen task as in the original app. Remount it (via `key`) for the next phrase. */
export default function TaskScreen(props: Props) {
  const { title, backTo, onBack, stats, menu = [], lesson, index, footer, notice, allowAsk = true, onChecked, onNext } =
    props;
  const { settings, updateSettings } = useUserData();
  const item = lesson.items[index];
  const mode = settings.mode;
  const [tiles] = useState(() => buildTiles(lesson.items, index));
  const answerLen = splitWords(item.en[0]).length;
  const [picked, setPicked] = useState<Tile[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('answer');
  const [answer, setAnswer] = useState('');
  const [praise] = useState(() => PRAISE[Math.floor(Math.random() * PRAISE.length)]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const stopListening = useRef<() => void>(() => {});
  const inputRef = useRef<HTMLInputElement>(null);

  const closest = closestAnswer(answer, item.en);
  const hint = findVerb(item.en[0]);
  const remaining = tiles.filter((t) => !picked.some((p) => p.id === t.id));

  function check(text: string) {
    if (status !== 'answer' || !normalize(text)) return;
    const ok = isCorrect(text, item.en);
    setAnswer(text);
    setStatus(ok ? 'correct' : 'wrong');
    onChecked(ok, text);
    if (settings.autoSpeak) speak(closestAnswer(text, item.en), settings.speechRate);
  }

  function next() {
    if (status !== 'answer') onNext();
  }

  function pick(tile: Tile) {
    if (status !== 'answer') return;
    const nextPicked = [...picked, tile];
    setPicked(nextPicked);
    if (nextPicked.length === answerLen) check(joinTiles(nextPicked.map((t) => t.word)));
    else if (settings.autoSpeak) speak(tile.word, settings.speechRate);
  }

  function undo() {
    if (status !== 'answer') return;
    if (mode === 'tiles') setPicked(picked.slice(0, -1));
    else setInput(input.trimEnd().split(/\s+/).slice(0, -1).join(' '));
  }

  function voice() {
    if (status !== 'answer') return;
    if (listening) {
      stopListening.current();
      return;
    }
    setVoiceError('');
    setListening(true);
    stopListening.current = listen(
      (alternatives) => check(alternatives.find((a) => isCorrect(a, item.en)) ?? alternatives[0]),
      (error) => {
        setListening(false);
        if (error) setVoiceError(error);
      },
    );
  }

  useEffect(() => () => stopListening.current(), []);

  useEffect(() => {
    document.body.classList.add('task-open');
    return () => document.body.classList.remove('task-open');
  }, []);

  useEffect(() => {
    if (mode === 'keyboard' && status === 'answer' && !sheet) inputRef.current?.focus();
  }, [mode, status, sheet]);

  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  useEffect(() => {
    if (status !== 'correct' || sheet) return;
    const timer = window.setTimeout(() => onNextRef.current(), AUTO_NEXT_MS);
    return () => window.clearTimeout(timer);
  }, [status, sheet]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSheet(null);
        setMenuOpen(false);
        return;
      }
      if (
        sheet ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLButtonElement
      ) {
        return;
      }
      if (e.key === 'Enter' && status !== 'answer') {
        e.preventDefault();
        next();
      } else if (e.key === 'Backspace' && mode === 'tiles') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const shown = status === 'correct' ? closest : status === 'wrong' ? answer : joinTiles(picked.map((t) => t.word));

  const menuItems: MenuItem[] = [
    {
      label: mode === 'tiles' ? 'Сложный режим: ввод с клавиатуры' : 'Обычный режим: выбор слов',
      onSelect: () => updateSettings({ mode: mode === 'tiles' ? 'keyboard' : 'tiles' }),
    },
    {
      label: settings.autoSpeak ? 'Выключить озвучку' : 'Включить озвучку',
      onSelect: () => updateSettings({ autoSpeak: !settings.autoSpeak }),
    },
    ...menu,
  ];

  return (
    <div className="task-screen">
      <div className="task-inner">
        <header className="task-bar">
          {onBack ? (
            <button type="button" className="task-back" onClick={onBack}>
              <Chevron /> {title}
            </button>
          ) : (
            <Link className="task-back" to={backTo ?? '/'}>
              <Chevron /> {title}
            </Link>
          )}
          <div className="task-stats">{stats}</div>
          <div className="task-menu">
            <button
              type="button"
              className="task-menu-btn"
              aria-label="Меню"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="5" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="12" cy="19" r="1.8" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="task-menu-backdrop" onClick={() => setMenuOpen(false)} />
                <ul className="task-menu-list" role="menu">
                  {menuItems.map((m) => (
                    <li key={m.label}>
                      <button
                        type="button"
                        role="menuitem"
                        className={m.danger ? 'danger' : undefined}
                        onClick={() => {
                          setMenuOpen(false);
                          m.onSelect();
                        }}
                      >
                        {m.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </header>

        <div className="task-phrase">{item.ru}</div>
        <div className={`task-answer ${status}`}>
          {mode === 'keyboard' && status === 'answer' ? (
            <form
              className="task-input"
              onSubmit={(e) => {
                e.preventDefault();
                check(input);
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Введите перевод"
                autoCapitalize="sentences"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="done"
              />
              <button type="submit" className="btn" disabled={!normalize(input)}>
                OK
              </button>
            </form>
          ) : (
            <span>{shown}</span>
          )}
        </div>

        <main className="task-body">
          {notice}
          {status === 'answer' && listening && (
            <div className="task-listening">
              <MicIcon />
              <span>Говорите по-английски…</span>
            </div>
          )}
          {status === 'answer' && !listening && mode === 'tiles' && (
            <div className={`word-grid${remaining.length > 10 ? ' dense' : ''}`}>
              {remaining.map((tile) => (
                <button type="button" key={tile.id} className="word-option" onClick={() => pick(tile)}>
                  {tile.word}
                </button>
              ))}
            </div>
          )}
          {status === 'answer' && voiceError && <p className="task-voice-error">{voiceError}</p>}

          {status === 'correct' && (
            <button type="button" className="task-result correct" onClick={next}>
              <span className="task-result-title">{praise}</span>
              {!sameAnswer(answer, item.en[0]) && (
                <span className="muted">Основной вариант: {item.en[0]}</span>
              )}
              <span className="muted small">нажмите, чтобы продолжить</span>
            </button>
          )}

          {status === 'wrong' && (
            <div className="task-result wrong">
              <div className="task-result-title">Неправильно</div>
              <DiffView answer={answer} expected={closest} />
              <div className="correct-line">
                Правильно: <b>{closest}</b> <SpeakButton text={closest} />
              </div>
              <AiExplain lessonTitle={`Урок ${lesson.id}. ${lesson.title}`} ru={item.ru} expected={item.en} answer={answer} />
              {allowAsk && (
                <button type="button" className="btn-ai" onClick={() => setSheet('ask')}>
                  Задать свой вопрос по фразе
                </button>
              )}
              <button type="button" className="btn wide" onClick={next}>
                Дальше
              </button>
            </div>
          )}
        </main>

        {footer}

        <nav className="task-tools">
          <button type="button" onClick={undo} disabled={status !== 'answer' || (mode === 'tiles' ? !picked.length : !input)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" />
              <path d="M17 9l-6 6M11 9l6 6" />
            </svg>
            Стереть
          </button>
          <button type="button" onClick={() => setSheet('hint')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M8 9h8M8 13h5" />
            </svg>
            Подсказка
          </button>
          <button type="button" onClick={() => setSheet('help')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z" />
            </svg>
            Правила
          </button>
          {allowAsk && (
            <button type="button" onClick={() => setSheet('ask')}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9.5" />
                <path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4" />
                <path d="M12 17.6v.1" />
              </svg>
              Вопрос
            </button>
          )}
          {listenAvailable() && (
            <button type="button" onClick={voice} disabled={status !== 'answer'} className={listening ? 'active' : undefined}>
              <MicIcon />
              {listening ? 'Стоп' : 'Голосом'}
            </button>
          )}
        </nav>
      </div>

      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(null)}>
          <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <b>{sheet === 'help' ? `Урок ${lesson.id}. ${lesson.title}` : SHEET_TITLES[sheet]}</b>
              <button type="button" className="sheet-close" aria-label="Закрыть" onClick={() => setSheet(null)}>
                ×
              </button>
            </div>
            <div className="sheet-body">
              {sheet === 'ask' ? (
                <AskTutor
                  context={{
                    lesson,
                    task: {
                      ru: item.ru,
                      expected: status === 'answer' ? item.en[0] : closest,
                      ...(status !== 'answer' && { answer, correct: status === 'correct' }),
                    },
                  }}
                />
              ) : sheet === 'hint' ? (
                hint || lesson.words?.length ? (
                  <>
                    {hint && <VerbHint verb={hint.verb} pronoun={hint.pronoun} />}
                    {lesson.words?.length ? (
                      <>
                        <h3 className="sheet-subtitle">Новые слова урока</h3>
                        <WordList words={lesson.words} />
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="muted">Для этой фразы нет таблицы глагола — вот правила урока.</p>
                    <Theory blocks={lesson.theory} />
                  </>
                )
              ) : (
                <Theory blocks={lesson.theory} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="chevron" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" />
    </svg>
  );
}
