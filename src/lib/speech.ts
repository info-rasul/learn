export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(text: string, rate = 0.9): void {
  if (!speechSupported) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  const voice = synth.getVoices().find((v) => v.lang.startsWith('en'));
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}
