import { useEffect, useState } from 'react';
import type { Lesson } from '../types';
import { decryptBook, getBookPassword, type EncryptedBook } from './bookCrypto';

const BASE = import.meta.env.BASE_URL;

let cache: Promise<Lesson[]> | null = null;

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}data/${path}`);
  if (!res.ok) throw new Error(`Не удалось загрузить ${path} (${res.status})`);
  return res.json() as Promise<T>;
}

/** The build packs all own lessons into lessons.json; in development they are read one by one. */
async function loadOwnLessons(): Promise<Lesson[]> {
  try {
    return (await fetchJSON<{ lessons: Lesson[] }>('lessons.json')).lessons;
  } catch {
    return loadFromIndex('');
  }
}

async function loadFromIndex(dir: string): Promise<Lesson[]> {
  const index = await fetchJSON<{ lessons: string[] }>(`${dir}index.json`);
  return Promise.all(index.lessons.map((file) => fetchJSON<Lesson>(dir + file)));
}

/**
 * Lessons built from the book's own exercises: in plain form they exist only on the owner's machine
 * (data/book is not in git) and are read by the dev server; built sites have them only encrypted
 * and need the password.
 */
async function loadBookLessons(): Promise<Lesson[] | null> {
  if (import.meta.env.DEV) {
    try {
      return await loadFromIndex('book/');
    } catch {
      // no local copy of the book
    }
  }
  const password = getBookPassword();
  if (!password) return null;
  try {
    return await decryptBook(await fetchJSON<EncryptedBook>('book.enc.json'), password);
  } catch (err) {
    console.warn(err);
    return null;
  }
}

export async function checkBookPassword(password: string): Promise<number> {
  const lessons = await decryptBook(await fetchJSON<EncryptedBook>('book.enc.json'), password);
  return lessons.length;
}

export function loadLessons(): Promise<Lesson[]> {
  if (!cache) {
    cache = loadBookLessons()
      .then((book) => book ?? loadOwnLessons())
      .then((lessons) => lessons.sort((a, b) => a.id - b.id));
    cache.catch(() => {
      cache = null;
    });
  }
  return cache;
}

export function useLessons(): { lessons: Lesson[] | null; error: string | null } {
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadLessons()
      .then((data) => alive && setLessons(data))
      .catch((err: unknown) => alive && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      alive = false;
    };
  }, []);

  return { lessons, error };
}
