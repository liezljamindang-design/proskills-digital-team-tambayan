import { react, setAct, toggleParty } from "../net/session";
import { Emoji } from "./Emoji";
import { useHq } from "../store";
import type { Mood } from "../types";

const EMOTES: { mood: Mood; emoji: string; label: string }[] = [
  { mood: "happy", emoji: "😊", label: "Happy" }, { mood: "laugh", emoji: "😆", label: "Laugh" }, { mood: "love", emoji: "😍", label: "Love" },
  { mood: "wow", emoji: "😮", label: "Wow" }, { mood: "cool", emoji: "😎", label: "Cool" }, { mood: "shy", emoji: "☺️", label: "Shy" },
  { mood: "think", emoji: "🤔", label: "Thinking" }, { mood: "sleepy", emoji: "🥱", label: "Sleepy" }, { mood: "cry", emoji: "😢", label: "Cry" },
  { mood: "angry", emoji: "😠", label: "Angry" }, { mood: "dance", emoji: "💃", label: "Dance" }, { mood: "blink", emoji: "😉", label: "Blink" },
];

/** Quick reactions. Each one shows on your chibi for a few seconds, for everyone. */
export function EmoteBar() {
  const mood = useHq((s) => s.me?.act?.mood);
  const riding = useHq((s) => Boolean(s.me?.act?.ride));
  const partyOn = useHq((s) => Boolean(s.me?.act?.party) || Object.values(s.peers).some((p) => p.act?.party));
  return (
    <div className="emotes" role="group" aria-label="Reactions">
      {EMOTES.map((e) => (
        <button key={e.mood} type="button" className="emote" aria-pressed={mood === e.mood} aria-label={e.label} title={e.label} onClick={() => react(e.mood)}>
          <Emoji char={e.emoji} size={26} />
        </button>
      ))}
      <button type="button" className={`emote ride-btn${riding ? " is-on" : ""}`} aria-pressed={riding} onClick={() => useHq.setState({ garageOpen: true })}>
        <Emoji char="🚲" size={22} /> {riding ? "Riding" : "Ride"}
      </button>
      {riding && (
        <button type="button" className="emote trick-btn" onClick={() => { const kinds = ["wheelie", "hop", "spin"] as const; setAct({ trick: { kind: kinds[Math.floor(Math.random() * kinds.length)], n: Date.now() } }); }}>
          <Emoji char="🤸" size={22} /> Trick
        </button>
      )}
      <button type="button" className={`emote party-btn${partyOn ? " is-on" : ""}`} aria-pressed={partyOn} onClick={toggleParty}>
        <Emoji char="🎉" size={22} /> {partyOn ? "Stop the party" : "Party mode"}
      </button>
    </div>
  );
}
