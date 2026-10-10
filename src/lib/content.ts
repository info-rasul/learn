import { useEffect, useState } from 'react';
import type { Lesson } from '../types';

const BASE = import.meta.env.BASE_URL;

let cache: Promise<Lesson[]> | null = null;

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}data/${path}`);
  if (!res.ok) throw new Error(`Не удалось загрузить ${path} (${res.status})`);
  return res.json() as Promise<T>;
}

export function loadLessons(): Promise<Lesson[]> {
  if (!cache) {
    cache = fetchJSON<{ lessons: string[] }>('index.json')
      .then((index) => Promise.all(index.lessons.map((file) => fetchJSON<Lesson>(file))))
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
