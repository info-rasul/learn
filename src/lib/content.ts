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

async function loadFromIndex(dir: string): Promise<Lesson[]> {
  const index = await fetchJSON<{ lessons: string[] }>(`${dir}index.json`);
  return Promise.all(index.lessons.map((file) => fetchJSON<Lesson>(dir + file)));
}

/**
 * Lessons built from the book's own exercises: in plain form they exist only on the owner's machine
 * (data/book is not in git); the published site has them only encrypted and needs the password.
 */
async function loadBookLessons(): Promise<Lesson[] | null> {
  try {
    return await loadFromIndex('book/');
  } catch {
    // not on the owner's machine
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
      .then((book) => book ?? loadFromIndex(''))
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
