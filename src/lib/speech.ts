export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

function utterance(text: string, rate: number): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('en'));
  if (voice) u.voice = voice;
  return u;
}

export function speak(text: string, rate = 0.9): void {
  if (!speechSupported) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance(text, rate));
}

/**
 * Reads texts one after another; `onProgress` gets the index being read, then -1 when done or stopped.
 * Returns a function that stops reading.
 */
export function speakAll(texts: string[], rate: number, onProgress: (index: number) => void): () => void {
  if (!speechSupported || !texts.length) {
    onProgress(-1);
    return () => {};
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  let stopped = false;
  texts.forEach((text, i) => {
    const u = utterance(text, rate);
    u.onstart = () => !stopped && onProgress(i);
    if (i === texts.length - 1) u.onend = () => !stopped && onProgress(-1);
    synth.speak(u);
  });
  return () => {
    stopped = true;
    synth.cancel();
    onProgress(-1);
  };
}
