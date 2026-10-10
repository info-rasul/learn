// Encrypts the owner-only lessons from public/data/book into public/data/book.enc.json,
// which is safe to publish: without the password it can't be read.
// The password is taken from BOOK_PASSWORD in .env.local; if it is missing, a random one is generated and saved there.
// Usage: node scripts/encrypt-book.mjs
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, webcrypto } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const root = join(import.meta.dirname, '..');
const envFile = join(root, '.env.local');
const ITERATIONS = 600_000;

const env = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
let password = env.match(/^BOOK_PASSWORD=(.+)$/m)?.[1]?.trim();
if (!password) {
  password = randomBytes(18).toString('base64url');
  appendFileSync(envFile, `${env && !env.endsWith('\n') ? '\n' : ''}BOOK_PASSWORD=${password}\n`);
  console.log('Generated a new password and saved it to .env.local as BOOK_PASSWORD');
}

const bookDir = join(root, 'public', 'data', 'book');
const index = JSON.parse(readFileSync(join(bookDir, 'index.json'), 'utf8'));
const lessons = index.lessons.map((file) => JSON.parse(readFileSync(join(bookDir, file), 'utf8')));

const salt = randomBytes(16);
const iv = randomBytes(12);
const { subtle } = webcrypto;
const material = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await subtle.deriveKey(
  { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt },
  material,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt'],
);
const data = await subtle.encrypt({ name: 'AES-GCM', iv }, key, gzipSync(JSON.stringify({ lessons })));

const out = {
  v: 1,
  kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: salt.toString('base64') },
  iv: iv.toString('base64'),
  data: Buffer.from(data).toString('base64'),
};
writeFileSync(join(root, 'public', 'data', 'book.enc.json'), JSON.stringify(out));
const items = lessons.reduce((s, l) => s + l.items.length, 0);
console.log(`Encrypted ${lessons.length} lessons (${items} items) into public/data/book.enc.json`);
