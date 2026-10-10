import type { Lesson } from '../types';

/** Same rules as the original app: the last 100 answers count, score = correct / 100 × 5. */
export const SCORE_WINDOW = 100;
export const MAX_SCORE = 5;
export const PASS_SCORE = 4.5;
export const PASS_CORRECT = Math.round((PASS_SCORE / MAX_SCORE) * SCORE_WINDOW);

export const correctCount = (results: boolean[] | undefined) => (results ?? []).filter(Boolean).length;

export const lessonScore = (results: boolean[] | undefined) => (correctCount(results) / SCORE_WINDOW) * MAX_SCORE;

export const isPassing = (results: boolean[] | undefined) => correctCount(results) >= PASS_CORRECT;

export const formatScore = (score: number) => score.toFixed(1).replace('.', ',');

export function pushResult(results: boolean[] | undefined, correct: boolean): boolean[] {
  return [...(results ?? []), correct].slice(-SCORE_WINDOW);
}

/** The first lesson is always open; every next one opens once the previous lesson has been passed. */
export function isUnlocked(lessons: Lesson[], index: number, passed: number[]): boolean {
  return index === 0 || passed.includes(lessons[index - 1].id);
}

export const gradeOf = (correct: number, total: number) => (total > 0 ? (correct / total) * MAX_SCORE : 0);
