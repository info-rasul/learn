import type { Lesson } from '../types';
import { readJSON, writeJSON } from './storage';

/** Encrypted bundle of the lessons built from the book's exercises; see scripts/encrypt-book.mjs. */
export interface EncryptedBook {
  v: 1;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  iv: string;
  data: string;
}

const PASSWORD_KEY = 'book-password';

/** Like the DeepSeek key, the password is stored per browser and shared by everyone who uses it. */
export const getBookPassword = () => readJSON<string>(PASSWORD_KEY, '');
export const saveBookPassword = (password: string) => writeJSON(PASSWORD_KEY, password.trim());

const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export class WrongPasswordError extends Error {}

export async function decryptBook(book: EncryptedBook, password: string): Promise<Lesson[]> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: book.kdf.hash, iterations: book.kdf.iterations, salt: fromBase64(book.kdf.salt) },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  let gzipped: ArrayBuffer;
  try {
    gzipped = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(book.iv) }, key, fromBase64(book.data));
  } catch {
    throw new WrongPasswordError('Неверный пароль к урокам из книги.');
  }
  const json = await new Response(new Blob([gzipped]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  return (JSON.parse(json) as { lessons: Lesson[] }).lessons;
}
