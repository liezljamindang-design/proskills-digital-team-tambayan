const EMOJI = ["😀", "😂", "😍", "🥳", "😎", "🤔", "😅", "😭", "👍", "👏", "🙌", "🙏", "🔥", "✨", "💯", "❤️", "🎉", "☕", "🍕", "🎮", "🏓", "💡", "🚀", "👋"];

/** A small grid of emoji. Picking one hands it to the caller, which adds it to the message being typed. */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="emoji-grid" role="group" aria-label="Emoji">
      {EMOJI.map((e) => (
        <button key={e} type="button" className="emoji-btn" onClick={() => onPick(e)} aria-label={`Add ${e}`}>{e}</button>
      ))}
    </div>
  );
}
