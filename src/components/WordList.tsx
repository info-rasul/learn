import { useEffect, useRef, useState } from 'react';
import type { LessonWord } from '../types';
import { speak, speakAll, speechSupported } from '../lib/speech';
import { useUserData } from '../lib/userData';

const spoken = (w: LessonWord) => (w.forms ? `${w.en}, ${w.forms}` : w.en);

/** «1 слово», «3 слова», «12 слов». */
export function wordsCount(n: number): string {
  const tens = n % 100;
  const ones = n % 10;
  const form = tens >= 11 && tens <= 14 ? 'слов' : ones === 1 ? 'слово' : ones >= 2 && ones <= 4 ? 'слова' : 'слов';
  return `${n} ${form}`;
}

/** The lesson's new words: tap a word to hear it; translations can be hidden to test yourself. */
export default function WordList({ words }: { words: LessonWord[] }) {
  const { settings } = useUserData();
  const [hideRu, setHideRu] = useState(false);
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(-1);
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => () => stop.current?.(), []);

  function tap(i: number) {
    stop.current?.();
    stop.current = null;
    speak(spoken(words[i]), settings.speechRate);
    if (hideRu) setShown((prev) => new Set(prev).add(i));
  }

  function toggleAll() {
    if (playing >= 0) {
      stop.current?.();
      stop.current = null;
      return;
    }
    stop.current = speakAll(words.map(spoken), settings.speechRate, setPlaying);
  }

  return (
    <div className="words">
      <div className="words-tools">
        {speechSupported && (
          <button type="button" className="btn small" onClick={toggleAll}>
            {playing >= 0 ? 'Остановить' : 'Прослушать все'}
          </button>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={hideRu}
            onChange={(e) => {
              setHideRu(e.target.checked);
              setShown(new Set());
            }}
          />
          Скрыть перевод
        </label>
      </div>
      {hideRu && <p className="muted small words-note">Вспомните перевод и нажмите на слово, чтобы проверить себя.</p>}
      <ul className="word-list">
        {words.map((w, i) => (
          <li key={w.en}>
            <button type="button" className={playing === i ? 'word-row playing' : 'word-row'} onClick={() => tap(i)}>
              <span className="word-en">
                <b>{w.en}</b>
                {w.forms && <span className="word-forms"> · {w.forms.replace(/,\s*/g, ' · ')}</span>}
              </span>
              <span className={hideRu && !shown.has(i) ? 'word-ru hidden' : 'word-ru'}>{w.ru}</span>
              {speechSupported && (
                <svg className="word-speaker" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11 5 6 9H2v6h4l5 4V5z" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                </svg>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
