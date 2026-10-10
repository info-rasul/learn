import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { readJSON, removeKey, writeJSON } from './storage';

export interface UserRecord {
  email: string;
  createdAt: number;
  lastLoginAt: number;
}

interface AuthValue {
  user: UserRecord | null;
  knownUsers: UserRecord[];
  /** Returns an error message, or null on success. */
  login: (email: string) => string | null;
  logout: () => void;
}

const USERS_KEY = 'users';
const SESSION_KEY = 'session';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<Record<string, UserRecord>>(() => readJSON(USERS_KEY, {}));
  const [email, setEmail] = useState<string | null>(() => readJSON<string | null>(SESSION_KEY, null));

  const login = useCallback((raw: string) => {
    const e = normalizeEmail(raw);
    if (!EMAIL_RE.test(e)) return 'Введите корректный адрес почты';
    const now = Date.now();
    setUsers((prev) => {
      const next = { ...prev, [e]: { email: e, createdAt: prev[e]?.createdAt ?? now, lastLoginAt: now } };
      writeJSON(USERS_KEY, next);
      return next;
    });
    writeJSON(SESSION_KEY, e);
    setEmail(e);
    return null;
  }, []);

  const logout = useCallback(() => {
    removeKey(SESSION_KEY);
    setEmail(null);
  }, []);

  const value = useMemo<AuthValue>(() => {
    const user = email ? (users[email] ?? { email, createdAt: 0, lastLoginAt: 0 }) : null;
    const knownUsers = Object.values(users).sort((a, b) => b.lastLoginAt - a.lastLoginAt);
    return { user, knownUsers, login, logout };
  }, [email, users, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
