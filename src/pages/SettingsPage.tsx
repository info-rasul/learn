import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useUserData } from '../lib/userData';
import { AiError, getAiConfig, MODEL_SUGGESTIONS, saveAiConfig, testConnection } from '../lib/deepseek';
import { speak, speechSupported } from '../lib/speech';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { settings, updateSettings, history, results, passed, resetAll } = useUserData();
  const [ai, setAi] = useState(getAiConfig);
  const [aiStatus, setAiStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  function saveAi() {
    saveAiConfig({ apiKey: ai.apiKey.trim(), model: ai.model.trim(), baseUrl: ai.baseUrl.trim() });
    setAiStatus({ ok: true, text: 'Сохранено на этом устройстве.' });
  }

  async function checkAi() {
    saveAi();
    setTesting(true);
    try {
      await testConnection();
      setAiStatus({ ok: true, text: 'DeepSeek отвечает, всё работает.' });
    } catch (err) {
      setAiStatus({ ok: false, text: err instanceof AiError ? err.message : 'Проверка не удалась.' });
    } finally {
      setTesting(false);
    }
  }

  function exportData() {
    const blob = new Blob(
      [
        JSON.stringify(
          { email: user?.email, exportedAt: new Date().toISOString(), results, passed, history },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `murphy-${user?.email ?? 'user'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="settings">
      <h1>Настройки</h1>

      <section className="panel">
        <h2>Аккаунт</h2>
        <p>
          Вы вошли как <b>{user?.email}</b>
        </p>
        <button type="button" className="btn-ghost" onClick={logout}>
          Выйти
        </button>
      </section>

      <section className="panel">
        <h2>Тренажёр</h2>
        <div className="field">
          <span>Способ ответа по умолчанию</span>
          <div className="segmented">
            <button
              type="button"
              className={settings.mode === 'tiles' ? 'active' : ''}
              onClick={() => updateSettings({ mode: 'tiles' })}
            >
              Собирать из слов
            </button>
            <button
              type="button"
              className={settings.mode === 'keyboard' ? 'active' : ''}
              onClick={() => updateSettings({ mode: 'keyboard' })}
            >
              Печатать (сложный)
            </button>
          </div>
          <span className="muted small">
            В сложном режиме слова не подсказываются — предложение нужно набрать с клавиатуры.
          </span>
        </div>
        {speechSupported && (
          <>
            <label className="check">
              <input
                type="checkbox"
                checked={settings.autoSpeak}
                onChange={(e) => updateSettings({ autoSpeak: e.target.checked })}
              />
              Озвучивать выбранные слова и правильный ответ
            </label>
            <label className="field">
              <span>Скорость озвучки: {settings.speechRate.toFixed(1)}</span>
              <input
                type="range"
                min={0.5}
                max={1.3}
                step={0.1}
                value={settings.speechRate}
                onChange={(e) => updateSettings({ speechRate: Number(e.target.value) })}
                onMouseUp={() => speak('Hello! How are you?', settings.speechRate)}
                onTouchEnd={() => speak('Hello! How are you?', settings.speechRate)}
              />
            </label>
          </>
        )}
      </section>

      <section className="panel">
        <h2>DeepSeek</h2>
        <p className="muted small">
          Нужен для разбора ошибок и анализа слабых мест. Ключ хранится только в этом браузере и отправляется только в
          DeepSeek.
        </p>
        <label className="field">
          <span>API-ключ</span>
          <input
            type="password"
            autoComplete="off"
            placeholder="sk-…"
            value={ai.apiKey}
            onChange={(e) => setAi({ ...ai, apiKey: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Модель</span>
          <input list="ai-models" value={ai.model} onChange={(e) => setAi({ ...ai, model: e.target.value })} />
          <datalist id="ai-models">
            {MODEL_SUGGESTIONS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>Адрес API</span>
          <input value={ai.baseUrl} onChange={(e) => setAi({ ...ai, baseUrl: e.target.value })} />
        </label>
        <div className="row">
          <button type="button" className="btn" onClick={saveAi}>
            Сохранить
          </button>
          <button type="button" className="btn-ghost" onClick={checkAi} disabled={testing || !ai.apiKey.trim()}>
            {testing ? 'Проверяю…' : 'Проверить подключение'}
          </button>
        </div>
        {aiStatus && <div className={aiStatus.ok ? 'status ok' : 'status error'}>{aiStatus.text}</div>}
      </section>

      <section className="panel">
        <h2>Данные</h2>
        <p className="muted small">
          История и прогресс хранятся в этом браузере. Ответов в истории: {history.length}.
        </p>
        <div className="row">
          <button type="button" className="btn-ghost" onClick={exportData}>
            Скачать историю (JSON)
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              if (confirm('Удалить баллы, открытые уроки, историю и анализ для этой почты?')) resetAll();
            }}
          >
            Сбросить всё
          </button>
        </div>
      </section>
    </div>
  );
}
