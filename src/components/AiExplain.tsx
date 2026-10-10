import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AiError, explainMistake, hasAiKey } from '../lib/deepseek';
import type { MistakeExplanation } from '../types';

interface Props {
  lessonTitle: string;
  ru: string;
  expected: string[];
  answer: string;
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; result: MistakeExplanation }
  | { status: 'error'; message: string };

export default function AiExplain(props: Props) {
  const [state, setState] = useState<State>({ status: 'idle' });

  if (!hasAiKey()) {
    return (
      <p className="ai-hint">
        Подробный разбор ошибки от DeepSeek станет доступен после добавления ключа в{' '}
        <Link to="/settings">настройках</Link>.
      </p>
    );
  }

  async function run() {
    setState({ status: 'loading' });
    try {
      setState({ status: 'done', result: await explainMistake(props) });
    } catch (err) {
      setState({ status: 'error', message: err instanceof AiError ? err.message : 'Не удалось получить разбор.' });
    }
  }

  if (state.status === 'idle') {
    return (
      <button type="button" className="btn-ai" onClick={run}>
        Почему неправильно? Спросить DeepSeek
      </button>
    );
  }
  if (state.status === 'loading') return <div className="ai-box loading">DeepSeek разбирает ответ…</div>;
  if (state.status === 'error') {
    return (
      <div className="ai-box error">
        {state.message}{' '}
        <button type="button" className="link-btn" onClick={run}>
          Повторить
        </button>
      </div>
    );
  }

  const { result } = state;
  return (
    <div className="ai-box">
      {result.acceptable && (
        <p className="ai-accept">DeepSeek считает ваш вариант тоже допустимым — эталон просто сформулирован иначе.</p>
      )}
      {result.errors.length > 0 && (
        <ul className="ai-errors">
          {result.errors.map((e, i) => (
            <li key={i}>
              <div>
                {e.wrong ? <s className="bad">{e.wrong}</s> : <span className="muted">(пропущено)</span>}
                {' → '}
                <b className="good">{e.correct}</b>
              </div>
              <div className="muted">{e.explanation}</div>
            </li>
          ))}
        </ul>
      )}
      {result.rule && (
        <p>
          <b>Правило:</b> {result.rule}
        </p>
      )}
      {result.tip && (
        <p>
          <b>Совет:</b> {result.tip}
        </p>
      )}
    </div>
  );
}
