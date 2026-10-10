import { speak, speechSupported } from '../lib/speech';
import { useUserData } from '../lib/userData';

export default function SpeakButton({ text }: { text: string }) {
  const { settings } = useUserData();
  if (!speechSupported) return null;
  return (
    <button
      type="button"
      className="icon-btn"
      title="Прослушать"
      aria-label="Прослушать"
      onClick={() => speak(text, settings.speechRate)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
      </svg>
    </button>
  );
}
