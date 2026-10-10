export type TheoryBlock =
  | { type: 'p' | 'h' | 'tip'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][] };

export interface LessonItem {
  ru: string;
  /** First entry is the reference answer, the rest are accepted alternatives. */
  en: string[];
}

export interface Lesson {
  id: number;
  title: string;
  subtitle: string;
  theory: TheoryBlock[];
  items: LessonItem[];
}

export type InputMode = 'tiles' | 'keyboard';

export interface Attempt {
  ts: number;
  lessonId: number;
  itemIndex: number;
  ru: string;
  expected: string;
  answer: string;
  correct: boolean;
  mode: InputMode;
  exam?: boolean;
}

/** Outcomes of the latest practice answers per lesson, oldest first. */
export type LessonResults = Record<number, boolean[]>;

export interface UserSettings {
  mode: InputMode;
  autoSpeak: boolean;
  speechRate: number;
}

export interface ExamResult {
  ts: number;
  perLesson: { lessonId: number; correct: number; total: number }[];
}

export interface MistakeExplanation {
  acceptable: boolean;
  errors: { wrong: string; correct: string; explanation: string }[];
  rule: string;
  tip: string;
}

export interface WeakTopic {
  topic: string;
  lessonIds: number[];
  evidence: string;
  advice: string;
}

export interface AnalysisResult {
  summary: string;
  strengths: string[];
  weakTopics: WeakTopic[];
  drills: { ru: string; en: string }[];
}

export interface SavedAnalysis {
  ts: number;
  attemptsCount: number;
  result: AnalysisResult;
}
