import { useState } from "react";

/**
 * Emoji drawn in 3D, using Microsoft's open-source Fluent Emoji pictures. If a
 * picture cannot be loaded, the ordinary emoji character is shown instead, so
 * nothing ever goes missing.
 */
const BASE = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/";
/** Emoji character to its Fluent name. A trailing "*" marks emoji that have skin-tone variants. */
const NAMES: Record<string, string> = {
  "😊": "Smiling face with smiling eyes", "😆": "Grinning squinting face", "😍": "Smiling face with heart-eyes", "😮": "Face with open mouth",
  "😎": "Smiling face with sunglasses", "☺️": "Smiling face", "🤔": "Thinking face", "🥱": "Yawning face", "😢": "Crying face", "😠": "Angry face",
  "💃": "Woman dancing*", "😉": "Winking face", "👍": "Thumbs up*", "❤️": "Red heart", "😂": "Face with tears of joy", "🙏": "Folded hands*",
  "😀": "Grinning face", "🥳": "Partying face", "😅": "Grinning face with sweat", "😭": "Loudly crying face", "👏": "Clapping hands*", "🙌": "Raising hands*",
  "🔥": "Fire", "✨": "Sparkles", "💯": "Hundred points", "🎉": "Party popper", "☕": "Hot beverage", "🍕": "Pizza", "🎮": "Video game", "🏓": "Ping pong",
  "💡": "Light bulb", "🚀": "Rocket", "👋": "Waving hand*",
};

function urlFor(char: string): string | null {
  const entry = NAMES[char];
  if (!entry) return null;
  const toned = entry.endsWith("*"), name = toned ? entry.slice(0, -1) : entry;
  const file = name.toLowerCase().replace(/ /g, "_");
  return `${BASE}${encodeURIComponent(name)}/${toned ? `Default/3D/${file}_3d_default.png` : `3D/${file}_3d.png`}`;
}

export function Emoji({ char, size = 22 }: { char: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = urlFor(char);
  if (!src || failed) return <span className="emoji-flat" aria-hidden="true" style={{ fontSize: size * 0.86 }}>{char}</span>;
  return <img className="emoji-3d" src={src} alt="" aria-hidden="true" width={size} height={size} loading="lazy" draggable={false} onError={() => setFailed(true)} />;
}
