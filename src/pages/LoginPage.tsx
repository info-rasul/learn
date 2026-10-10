import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';

export default function LoginPage() {
  const { login, knownUsers } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(login(email));
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="brand big">
          <span className="brand-logo">EG</span>
          <span className="brand-text">
            Мёрфи<small>грамматика по методу «Полиглот»</small>
          </span>
        </div>

        <form onSubmit={submit} className="login-form">
          <label htmlFor="email">Электронная почта</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          {error && <div className="form-error">{error}</div>}
          <button className="btn wide" type="submit">
            Войти
          </button>
        </form>

        <p className="muted small">
          Подтверждать почту не нужно: она отделяет вашу историю и прогресс от других учеников. Все данные хранятся
          только в этом браузере на этом устройстве.
        </p>

        {knownUsers.length > 0 && (
          <div className="known-users">
            <div className="muted small">Уже входили на этом устройстве:</div>
            {knownUsers.map((u) => (
              <button key={u.email} type="button" className="chip" onClick={() => login(u.email)}>
                {u.email}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
