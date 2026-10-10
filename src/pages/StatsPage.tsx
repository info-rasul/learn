import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLessons } from '../lib/content';
import { useUserData } from '../lib/userData';
import { AiError, analyzeHistory, hasAiKey } from '../lib/deepseek';
import SpeakButton from '../components/SpeakButton';
import ScoreChart from '../components/ScoreChart';

const MIN_ATTEMPTS_FOR_ANALYSIS = 10;

export default function StatsPage() {
  const { lessons, error } = useLessons();
  const { history, analysis, saveAnalysis, results, passed } = useUserData();
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (error) return <div className="error-box">{error}</div>;
  if (!lessons) return <div className="loading">Загрузка…</div>;

  const correct = history.filter((a) => a.correct).length;
  const accuracy = history.length ? Math.round((correct / history.length) * 100) : 0;
  const days = new Set(history.map((a) => new Date(a.ts).toDateString())).size;
  const mistakes = history.filter((a) => !a.correct).slice(-20).reverse();

  async function runAnalysis() {
    if (!lessons) return;
    setLoading(true);
    setAiError(null);
    try {
      const result = await analyzeHistory(lessons, history);
      saveAnalysis({ ts: Date.now(), attemptsCount: history.length, result });
    } catch (err) {
      setAiError(err instanceof AiError ? err.message : 'Не удалось выполнить анализ.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stats">
      <h1>Статистика</h1>

      <div className="stat-cards">
        <div className="stat-card">
          <b>{history.length}</b>
          <span>ответов</span>
        </div>
        <div className="stat-card">
          <b>{accuracy}%</b>
          <span>точность</span>
        </div>
        <div className="stat-card">
          <b>{days}</b>
          <span>дней занятий</span>
        </div>
      </div>

      <section className="panel">
        <h2>Баллы по урокам</h2>
        <ScoreChart lessons={lessons} results={results} passed={passed} />
        <p className="muted small">
          Балл урока — правильные ответы из последних 100, делённые на 100 и умноженные на 5. Линия — проходной балл.
        </p>
      </section>

      <section className="panel">
        <h2>Анализ слабых мест (DeepSeek)</h2>
        {!hasAiKey() ? (
          <p className="muted">
            Добавьте ключ DeepSeek в <Link to="/settings">настройках</Link>, чтобы получить разбор всей истории.
          </p>
        ) : history.length < MIN_ATTEMPTS_FOR_ANALYSIS ? (
          <p className="muted">Ответьте хотя бы на {MIN_ATTEMPTS_FOR_ANALYSIS} фраз, чтобы анализ был осмысленным.</p>
        ) : (
          <button type="button" className="btn-ai" onClick={runAnalysis} disabled={loading}>
            {loading ? 'DeepSeek анализирует историю…' : analysis ? 'Обновить анализ' : 'Проанализировать мою историю'}
          </button>
        )}
        {aiError && <div className="ai-box error">{aiError}</div>}

        {analysis && (
          <div className="analysis">
            <div className="muted small">
              Анализ от {new Date(analysis.ts).toLocaleString('ru-RU')} по {analysis.attemptsCount} ответам
            </div>
            <p>{analysis.result.summary}</p>

            {analysis.result.strengths.length > 0 && (
              <>
                <h3>Получается хорошо</h3>
                <ul>
                  {analysis.result.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </>
            )}

            {analysis.result.weakTopics.length > 0 && (
              <>
                <h3>Слабые места</h3>
                {analysis.result.weakTopics.map((t, i) => (
                  <div key={i} className="weak-topic">
                    <div className="weak-title">{t.topic}</div>
                    {t.evidence && <div className="muted small">{t.evidence}</div>}
                    <div>{t.advice}</div>
                    {t.lessonIds?.length > 0 && (
                      <div className="chips">
                        {t.lessonIds.map((id) => (
                          <Link key={id} className="chip" to={`/lesson/${id}`}>
                            Урок {id}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {analysis.result.drills.length > 0 && (
              <>
                <h3>Фразы для тренировки</h3>
                <ul className="drills">
                  {analysis.result.drills.map((d, i) => (
                    <li key={i}>
                      <div>{d.ru}</div>
                      <details>
                        <summary>Показать перевод</summary>
                        <span className="good">{d.en}</span> <SpeakButton text={d.en} />
                      </details>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Последние ошибки</h2>
        {mistakes.length === 0 ? (
          <p className="muted">Ошибок пока нет.</p>
        ) : (
          <ul className="mistakes">
            {mistakes.map((m) => (
              <li key={m.ts}>
                <div className="muted small">
                  Урок {m.lessonId} · {new Date(m.ts).toLocaleDateString('ru-RU')}
                </div>
                <div>{m.ru}</div>
                <div>
                  <s className="bad">{m.answer}</s> → <b className="good">{m.expected}</b>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
