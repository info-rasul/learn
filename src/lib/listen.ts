interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

type RecognitionCtor = new () => Recognition;

const w = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as RecognitionCtor | undefined;

const BROKEN_KEY = 'p16:listen-broken';

/** False when the browser has no recognizer or it already failed with a service error in this session. */
export function listenAvailable(): boolean {
  return Boolean(Ctor) && sessionStorage.getItem(BROKEN_KEY) !== '1';
}

// Chromium-based browsers send audio to Google's speech service; Electron apps (incl. Cursor's
// built-in browser) have no access to it, so they always fail with "network".
const SERVICE_ERRORS = new Set(['network', 'service-not-allowed', 'language-not-supported']);

const ERRORS: Record<string, string> = {
  'not-allowed': 'Нет доступа к микрофону — разрешите его в настройках браузера.',
  'no-speech': 'Ничего не слышно. Попробуйте ещё раз.',
  'audio-capture': 'Микрофон не найден.',
  network:
    'В этом браузере не работает сервис распознавания речи (он не связан с вашим интернетом). Голосовой ответ работает в Safari и в обычном Chrome.',
  'service-not-allowed': 'Браузер запретил распознавание речи. Попробуйте Safari или Chrome.',
  'language-not-supported': 'Браузер не умеет распознавать английскую речь.',
};

const WRONG_LANGUAGE_HINT =
  'В Safari на Mac добавьте английский в «Системные настройки → Клавиатура → Диктовка → Языки», на iPhone — в «Настройки → Основные → Клавиатура». Ответ не засчитан.';

/** Listens for one English phrase. Returns a function that cancels listening. */
export function listen(onText: (alternatives: string[]) => void, onEnd: (error?: string) => void): () => void {
  if (!Ctor) {
    onEnd('Этот браузер не умеет распознавать речь.');
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 5;
  let error: string | undefined;
  rec.onresult = (e) => {
    const first = e.results[0];
    const all = Array.from({ length: first.length }, (_, i) => first[i].transcript.trim()).filter(Boolean);
    // Some browsers (Safari above all) ignore `lang` and recognize in the system language.
    const english = all.filter((t) => !/[а-яё]/i.test(t));
    if (english.length) onText(english);
    else if (all.length) error = `Браузер распознал речь по-русски («${all[0]}»), а не по-английски. ${WRONG_LANGUAGE_HINT}`;
  };
  rec.onerror = (e) => {
    if (e.error === 'aborted') return;
    error = ERRORS[e.error] ?? 'Не удалось распознать речь.';
    if (SERVICE_ERRORS.has(e.error)) sessionStorage.setItem(BROKEN_KEY, '1');
  };
  rec.onend = () => onEnd(error);
  rec.start();
  return () => rec.abort();
}
