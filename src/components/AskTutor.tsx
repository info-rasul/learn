import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AiError, askTutor, hasAiKey, type AskContext, type ChatMessage } from '../lib/deepseek';
import { readJSON, writeJSON } from '../lib/storage';
import { courseKey, useUserData } from '../lib/userData';

/** Dialogs are kept per lesson; older turns are dropped so localStorage stays small. */
const MAX_STORED = 40;

const LESSON_QUESTIONS = [
  'Объясни правило урока попроще',
  'Какие типичные ошибки в этой теме?',
  'Дай 5 фраз для тренировки',
];
const TASK_QUESTIONS = ['Почему здесь такое время?', 'Разбери эту фразу по словам', 'Как сказать это по-другому?'];

export default function AskTutor({ context }: { context: AskContext }) {
  const { email } = useUserData();
  const key = courseKey(email, `chat:${context.lesson.id}`);
  const [messages, setMessages] = useState<ChatMessage[]>(() => readJSON(key, []));
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    writeJSON(key, messages.slice(-MAX_STORED));
  }, [key, messages]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, pending, error]);

  if (!hasAiKey()) {
    return (
      <p className="ai-hint">
        Чтобы задавать вопросы DeepSeek, добавьте ключ в <Link to="/settings">настройках</Link>.
      </p>
    );
  }

  async function send(question: string) {
    const text = question.trim();
    if (!text || pending) return;
    setDraft('');
    setError('');
    setPending(text);
    try {
      const reply = await askTutor(context, messages, text);
      setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content: reply }]);
      setPending(null);
    } catch (err) {
      setPending(null);
      setDraft(text);
      setError(err instanceof AiError ? err.message : 'Не удалось получить ответ.');
    }
  }

  const suggestions = [...(context.task ? TASK_QUESTIONS : []), ...LESSON_QUESTIONS];

  return (
    <div className="ask">
      {messages.length === 0 && !pending && (
        <p className="muted ask-intro">
          Спросите что угодно по теме урока{context.task ? ' или по этой фразе' : ''}. DeepSeek видит правила урока
          {context.task ? ' и фразу на экране' : ''}.
        </p>
      )}
      <div className="ask-log">
        {messages.map((m, i) => (
          <div key={i} className={`ask-msg ${m.role}`}>
            {m.role === 'assistant' ? <RichText text={m.content} /> : m.content}
          </div>
        ))}
        {pending && (
          <>
            <div className="ask-msg user">{pending}</div>
            <div className="ask-msg assistant loading">DeepSeek думает…</div>
          </>
        )}
        {error && <div className="ai-box error">{error}</div>}
        <div ref={endRef} />
      </div>

      {!pending && (
        <div className="ask-chips">
          {suggestions.map((q) => (
            <button key={q} type="button" className="chip" onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        className="ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={2}
          placeholder="Ваш вопрос…"
          disabled={Boolean(pending)}
        />
        <button type="submit" className="btn" disabled={!draft.trim() || Boolean(pending)}>
          Спросить
        </button>
      </form>
      {messages.length > 0 && !pending && (
        <button type="button" className="link-btn ask-clear" onClick={() => setMessages([])}>
          Очистить диалог
        </button>
      )}
    </div>
  );
}

/** Paragraphs, «- » lists and **bold** — the only formatting the tutor is asked to use. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim());
        if (lines.length && lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

function inline(line: string): ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part.replace(/^#+\s*/, ''),
  );
}
