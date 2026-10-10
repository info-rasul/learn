import type { AnalysisResult, Attempt, Lesson, MistakeExplanation } from '../types';
import { readJSON, writeJSON } from './storage';

export interface AiConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

const env = import.meta.env;
export const DEFAULT_MODEL = env.VITE_DEEPSEEK_MODEL || 'deepseek-flash';
export const DEFAULT_BASE_URL = env.VITE_DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
export const MODEL_SUGGESTIONS = ['deepseek-flash', 'deepseek-v4-flash', 'deepseek-v4-pro'];

const CONFIG_KEY = 'ai';

/** The key is stored per device, so every learner on this browser shares it. */
export function getAiConfig(): AiConfig {
  const saved = readJSON<Partial<AiConfig>>(CONFIG_KEY, {});
  return {
    apiKey: saved.apiKey || env.VITE_DEEPSEEK_API_KEY || '',
    model: saved.model || DEFAULT_MODEL,
    baseUrl: saved.baseUrl || DEFAULT_BASE_URL,
  };
}

export function saveAiConfig(config: Partial<AiConfig>): void {
  writeJSON(CONFIG_KEY, { ...readJSON<Partial<AiConfig>>(CONFIG_KEY, {}), ...config });
}

export const hasAiKey = () => getAiConfig().apiKey.length > 0;

export class AiError extends Error {}

function httpErrorMessage(status: number): string {
  if (status === 401) return 'DeepSeek отклонил ключ API. Проверьте его в настройках.';
  if (status === 402) return 'На балансе DeepSeek закончились средства.';
  if (status === 429) return 'Слишком много запросов к DeepSeek. Попробуйте через минуту.';
  if (status >= 500) return 'Сервер DeepSeek временно недоступен.';
  return `DeepSeek вернул ошибку ${status}.`;
}

function parseJSONContent<T>(content: string): T {
  const cleaned = content.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new AiError('DeepSeek прислал ответ в неожиданном формате. Попробуйте ещё раз.');
  }
}

const REQUEST_TIMEOUT_MS = 60_000;
const NETWORK_RETRIES = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chatJSON<T>(system: string, user: unknown, maxTokens: number): Promise<T> {
  const content = await complete(
    [
      { role: 'system', content: system },
      { role: 'user', content: typeof user === 'string' ? user : JSON.stringify(user) },
    ],
    { maxTokens, temperature: 0.3, json: true },
  );
  return parseJSONContent<T>(content);
}

async function complete(
  messages: ChatMessage[],
  options: { maxTokens: number; temperature: number; json?: boolean },
): Promise<string> {
  const { model, baseUrl } = getAiConfig();
  const apiKey = getAiConfig().apiKey.replace(/\s+/g, '');
  if (!apiKey) throw new AiError('Добавьте ключ DeepSeek в настройках.');
  // fetch rejects non-Latin-1 header values with the same TypeError as a network failure.
  if (!/^[\x21-\x7e]+$/.test(apiKey)) {
    throw new AiError('В ключе DeepSeek есть лишние символы (русские буквы или кавычки). Вставьте ключ заново в настройках.');
  }

  const request = () =>
    fetch(`${baseUrl.trim().replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
        thinking: { type: 'disabled' },
      }),
    });

  let res: Response | undefined;
  for (let attempt = 0; !res; attempt++) {
    try {
      res = await request();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'TimeoutError') {
        throw new AiError('DeepSeek не ответил за минуту. Попробуйте ещё раз.');
      }
      if (attempt >= NETWORK_RETRIES) {
        const reason = e instanceof Error ? e.message : String(e);
        throw new AiError(`Браузер не смог достучаться до DeepSeek (${reason}). Обычно это обрыв VPN или блокировщик рекламы.`);
      }
      await sleep(1000 * (attempt + 1));
    }
  }
  if (!res.ok) throw new AiError(httpErrorMessage(res.status));

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AiError('DeepSeek вернул пустой ответ.');
  return content;
}

const ASK_PROMPT = `Ты — преподаватель английского для русскоговорящего ученика. Курс идёт по разделам English Grammar in Use Рэймонда Мёрфи, тренировка — по методике «Полиглот» Дмитрия Петрова: ученик переводит фразы с русского на английский.
Ниже — урок, который ученик сейчас проходит, и, если есть, фраза, над которой он работает. Отвечай на его вопросы по-русски, простыми словами, коротко (обычно до 150 слов), с 1–3 английскими примерами и их переводом.
Если вопрос про фразу — объясни именно её. Если ученик просит придумать упражнения — дай 3–5 фраз на русском и ответы на английском.
На вопросы, не связанные с английским языком, вежливо отвечай, что помогаешь только с английским.
Оформление: обычный текст, абзацы через пустую строку, списки строками с «- », английские слова и примеры выделяй **жирным**. Без заголовков и таблиц.`;

export interface AskContext {
  lesson: Lesson;
  /** The phrase on screen, with the learner's answer once it was checked. */
  task?: { ru: string; expected: string; answer?: string; correct?: boolean };
}

const MAX_THEORY_CHARS = 4000;
/** Earlier turns sent along with a question; older ones are dropped to keep requests small. */
const MAX_TURNS_SENT = 12;

function theoryText(lesson: Lesson): string {
  const lines = lesson.theory.map((b) => {
    if (b.type === 'list') return b.items.map((i) => `- ${i}`).join('\n');
    if (b.type === 'table') return [b.head, ...b.rows].map((r) => r.join(' | ')).join('\n');
    return b.text;
  });
  return lines.join('\n').slice(0, MAX_THEORY_CHARS);
}

function contextText({ lesson, task }: AskContext): string {
  const parts = [`Урок ${lesson.id}. ${lesson.title} — ${lesson.subtitle}`, `Теория урока:\n${theoryText(lesson)}`];
  if (task) {
    const lines = [`Фраза на экране: «${task.ru}»`, `Эталонный перевод: ${task.expected}`];
    if (task.answer) lines.push(`Ответ ученика: ${task.answer} (${task.correct ? 'засчитан' : 'ошибка'})`);
    else lines.push('Ученик ещё не ответил — не раскрывай перевод целиком, если он прямо не просит.');
    parts.push(lines.join('\n'));
  }
  return parts.join('\n\n');
}

/** Free-form question about the lesson; `history` holds earlier turns of this lesson's dialog. */
export function askTutor(context: AskContext, history: ChatMessage[], question: string): Promise<string> {
  return complete(
    [
      { role: 'system', content: `${ASK_PROMPT}\n\n${contextText(context)}` },
      ...history.slice(-MAX_TURNS_SENT),
      { role: 'user', content: question },
    ],
    { maxTokens: 1200, temperature: 0.5 },
  ).then((text) => text.trim());
}

const EXPLAIN_PROMPT = `Ты — преподаватель английского для русскоговорящих. Курс идёт по разделам English Grammar in Use Рэймонда Мёрфи, тренировка — по методике «Полиглот» Дмитрия Петрова.
Ученик переводит фразу с русского на английский. Сравни его ответ с эталонными вариантами, найди ошибки и кратко объясни их по-русски, простыми словами.
Ответь строго в формате JSON:
{
  "acceptable": boolean,          // true, если ответ ученика тоже правильный перевод, хоть и не совпал с эталоном
  "errors": [
    { "wrong": string,            // фрагмент из ответа ученика; пустая строка, если слово пропущено
      "correct": string,          // как должно быть
      "explanation": string }     // почему, 1–2 предложения
  ],
  "rule": string,                 // правило грамматики, к которому относится ошибка, одним-двумя предложениями
  "tip": string                   // короткий совет, как не ошибаться
}`;

export function explainMistake(params: {
  lessonTitle: string;
  ru: string;
  expected: string[];
  answer: string;
}): Promise<MistakeExplanation> {
  return chatJSON<MistakeExplanation>(
    EXPLAIN_PROMPT,
    {
      lesson: params.lessonTitle,
      russian: params.ru,
      reference_answers: params.expected,
      student_answer: params.answer,
    },
    800,
  ).then((r) => ({
    acceptable: Boolean(r.acceptable),
    errors: Array.isArray(r.errors) ? r.errors : [],
    rule: r.rule ?? '',
    tip: r.tip ?? '',
  }));
}

const ANALYSIS_PROMPT = `Ты — преподаватель английского. Курс из 145 уроков по разделам English Grammar in Use Рэймонда Мёрфи, тренировка — по методике «Полиглот» Дмитрия Петрова.
Тебе дана статистика ученика по урокам и список его ошибок. Выяви слабые места в знаниях: какие грамматические темы и конструкции вызывают ошибки, повторяются ли одинаковые ошибки.
Пиши по-русски, конкретно, опираясь на примеры из ошибок.
Ответь строго в формате JSON:
{
  "summary": string,              // общий вывод, 2–4 предложения
  "strengths": [string],          // что получается хорошо
  "weakTopics": [
    { "topic": string,            // тема, например «Отрицание в Present Simple»
      "lessonIds": [number],      // номера уроков курса, которые стоит повторить
      "evidence": string,         // примеры ошибок ученика
      "advice": string }          // что конкретно делать
  ],
  "drills": [ { "ru": string, "en": string } ]   // 5–8 новых фраз для тренировки слабых тем
}`;

const MAX_MISTAKES_SENT = 80;

export function analyzeHistory(lessons: Lesson[], history: Attempt[]): Promise<AnalysisResult> {
  const stats = lessons
    .map((lesson) => {
      const attempts = history.filter((a) => a.lessonId === lesson.id);
      const correct = attempts.filter((a) => a.correct).length;
      return { lessonId: lesson.id, title: lesson.title, attempts: attempts.length, correct };
    })
    .filter((s) => s.attempts > 0);

  const mistakes = history
    .filter((a) => !a.correct)
    .slice(-MAX_MISTAKES_SENT)
    .map((a) => ({ lessonId: a.lessonId, russian: a.ru, expected: a.expected, answer: a.answer }));

  return chatJSON<AnalysisResult>(
    ANALYSIS_PROMPT,
    {
      course: lessons.map((l) => ({ id: l.id, title: l.title, topic: l.subtitle })),
      stats,
      mistakes,
      totalAttempts: history.length,
    },
    2000,
  ).then((r) => ({
    summary: r.summary ?? '',
    strengths: Array.isArray(r.strengths) ? r.strengths : [],
    weakTopics: Array.isArray(r.weakTopics) ? r.weakTopics : [],
    drills: Array.isArray(r.drills) ? r.drills : [],
  }));
}

export async function testConnection(): Promise<void> {
  const r = await chatJSON<{ ok?: boolean }>('Answer in JSON.', 'Return {"ok": true} as JSON.', 20);
  if (!r.ok) throw new AiError('DeepSeek ответил, но не так, как ожидалось.');
}
