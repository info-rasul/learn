import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Attempt, ExamResult, LessonResults, SavedAnalysis, UserSettings } from '../types';
import { readJSON, userKey, writeJSON } from './storage';
import { isPassing, pushResult } from './scoring';

const HISTORY_LIMIT = 5000;

/** Progress of the Murphy course is kept apart from the old 16-lesson course: lesson ids overlap. */
const courseKey = (email: string, name: string) => userKey(email, `murphy:${name}`);

export const DEFAULT_SETTINGS: UserSettings = { mode: 'tiles', autoSpeak: true, speechRate: 0.9 };

interface UserDataValue {
  email: string;
  results: LessonResults;
  passed: number[];
  history: Attempt[];
  settings: UserSettings;
  analysis: SavedAnalysis | null;
  lastExam: ExamResult | null;
  recordAttempt: (attempt: Omit<Attempt, 'ts'>) => void;
  updateSettings: (patch: Partial<UserSettings>) => void;
  saveAnalysis: (analysis: SavedAnalysis) => void;
  saveExam: (exam: ExamResult) => void;
  resetLesson: (lessonId: number) => void;
  resetAll: () => void;
}

const UserDataContext = createContext<UserDataValue | null>(null);

function resultsFromHistory(history: Attempt[]): LessonResults {
  const results: LessonResults = {};
  for (const a of history) {
    if (!a.exam) results[a.lessonId] = pushResult(results[a.lessonId], a.correct);
  }
  return results;
}

function loadResults(email: string, history: Attempt[]): LessonResults {
  const stored = readJSON<LessonResults | null>(courseKey(email, 'results'), null);
  return stored ?? resultsFromHistory(history);
}

function loadPassed(email: string, results: LessonResults): number[] {
  const stored = readJSON<number[] | null>(courseKey(email, 'passed'), null);
  return stored ?? Object.keys(results).map(Number).filter((id) => isPassing(results[id]));
}

/** All learning data lives in this browser only, namespaced by the signed-in email. */
export function UserDataProvider({ email, children }: { email: string; children: ReactNode }) {
  const [history, setHistory] = useState<Attempt[]>(() => readJSON(courseKey(email, 'history'), []));
  const [results, setResults] = useState<LessonResults>(() => loadResults(email, history));
  const [passed, setPassed] = useState<number[]>(() => loadPassed(email, results));
  const [settings, setSettings] = useState<UserSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...readJSON<Partial<UserSettings>>(userKey(email, 'settings'), {}),
  }));
  const [analysis, setAnalysis] = useState<SavedAnalysis | null>(() => readJSON(courseKey(email, 'analysis'), null));
  const [lastExam, setLastExam] = useState<ExamResult | null>(() => readJSON(courseKey(email, 'exam'), null));

  useEffect(() => writeJSON(courseKey(email, 'history'), history), [email, history]);
  useEffect(() => writeJSON(courseKey(email, 'results'), results), [email, results]);
  useEffect(() => writeJSON(courseKey(email, 'passed'), passed), [email, passed]);
  useEffect(() => writeJSON(userKey(email, 'settings'), settings), [email, settings]);
  useEffect(() => writeJSON(courseKey(email, 'analysis'), analysis), [email, analysis]);
  useEffect(() => writeJSON(courseKey(email, 'exam'), lastExam), [email, lastExam]);

  // A lesson stays passed even if its score later drops, so the next lesson never re-locks.
  useEffect(() => {
    const newlyPassed = Object.keys(results)
      .map(Number)
      .filter((id) => isPassing(results[id]) && !passed.includes(id));
    if (newlyPassed.length) setPassed((prev) => [...prev, ...newlyPassed.filter((id) => !prev.includes(id))]);
  }, [results, passed]);

  const recordAttempt = useCallback((attempt: Omit<Attempt, 'ts'>) => {
    setHistory((prev) => {
      const next = [...prev, { ...attempt, ts: Date.now() }];
      return next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next;
    });
    if (!attempt.exam) {
      setResults((prev) => ({ ...prev, [attempt.lessonId]: pushResult(prev[attempt.lessonId], attempt.correct) }));
    }
  }, []);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetLesson = useCallback((lessonId: number) => {
    setResults((prev) => {
      const next = { ...prev };
      delete next[lessonId];
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setHistory([]);
    setResults({});
    setPassed([]);
    setAnalysis(null);
    setLastExam(null);
  }, []);

  const value = useMemo<UserDataValue>(
    () => ({
      email,
      results,
      passed,
      history,
      settings,
      analysis,
      lastExam,
      recordAttempt,
      updateSettings,
      saveAnalysis: setAnalysis,
      saveExam: setLastExam,
      resetLesson,
      resetAll,
    }),
    [email, results, passed, history, settings, analysis, lastExam, recordAttempt, updateSettings, resetLesson, resetAll],
  );

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserDataValue {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error('useUserData must be used inside UserDataProvider');
  return ctx;
}
