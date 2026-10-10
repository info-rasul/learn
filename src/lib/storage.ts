const PREFIX = 'p16:';

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn('Не удалось сохранить данные', key, err);
  }
}

export function removeKey(key: string): void {
  localStorage.removeItem(PREFIX + key);
}

export const userKey = (email: string, name: string) => `u:${email}:${name}`;
