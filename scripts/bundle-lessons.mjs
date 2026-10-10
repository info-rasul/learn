// Packs the lessons listed in data/index.json into one data/lessons.json, so the site loads them in a single request.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'dist/data';
const index = JSON.parse(await readFile(join(dir, 'index.json'), 'utf8'));
const lessons = await Promise.all(
  index.lessons.map(async (file) => JSON.parse(await readFile(join(dir, file), 'utf8'))),
);
await writeFile(join(dir, 'lessons.json'), JSON.stringify({ lessons }));
console.log(`Bundled ${lessons.length} lessons into ${join(dir, 'lessons.json')}`);
