import { react } from "../net/session";
import { useHq } from "../store";
import type { Mood } from "../types";

const EMOTES: { mood: Mood; emoji: string; label: string }[] = [
  { mood: "happy", emoji: "😊", label: "Happy" },
  { mood: "angry", emoji: "😠", label: "Angry" },
  { mood: "dance", emoji: "💃", label: "Dance" },
  { mood: "blink", emoji: "😉", label: "Blink" },
];

/** Quick reactions. Each one shows on your chibi for a few seconds, for everyone. */
export function EmoteBar() {
  const mood = useHq((s) => s.me?.act?.mood);
  return (
    <div className="emotes" role="group" aria-label="Reactions">
      {EMOTES.map((e) => (
        <button key={e.mood} type="button" className="emote" aria-pressed={mood === e.mood} onClick={() => react(e.mood)}>
          <span aria-hidden="true">{e.emoji}</span> {e.label}
        </button>
      ))}
    </div>
  );
}
