import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const NAV = [
  { to: '/', label: 'Уроки', icon: <path d="M4 5h16M4 12h16M4 19h10" /> },
  {
    to: '/table',
    label: 'Таблица',
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      </>
    ),
  },
  {
    to: '/exam',
    label: 'Экзамен',
    icon: (
      <>
        <path d="M9 11l3 3 8-8" />
        <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
      </>
    ),
  },
  { to: '/stats', label: 'Статистика', icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
  {
    to: '/settings',
    label: 'Настройки',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
      </>
    ),
  },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const inPractice = pathname.endsWith('/practice');

  return (
    <div className={inPractice ? 'app in-practice' : 'app'}>
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-logo">EG</span>
          <span className="brand-text">
            Мёрфи<small>грамматика по методу «Полиглот»</small>
          </span>
        </Link>
        <nav className="topnav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-box">
          <span className="user-email" title={user?.email}>
            {user?.email}
          </span>
          <button className="btn-ghost small" onClick={logout}>
            Выйти
          </button>
        </div>
      </header>

      <main className="container">{children}</main>

      <nav className="tabbar">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {item.icon}
            </svg>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
