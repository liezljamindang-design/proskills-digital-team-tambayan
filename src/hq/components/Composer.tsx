import { useState, type FormEvent } from "react";
import { EmojiPicker } from "./EmojiPicker";

interface Props {
  id: string;
  placeholder: string;
  onSend: (text: string) => void;
}

/** Message box with an emoji button. Used for the public room, private chats and the quick bar under the office. */
export function Composer({ id, placeholder, onSend }: Props) {
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
    setEmojiOpen(false);
  }

  return (
    <form className="composer" onSubmit={submit}>
      {emojiOpen && <EmojiPicker onPick={(emoji) => setText((t) => (t + emoji).slice(0, 280))} />}
      <div className="composer-row">
        <button type="button" className="icon-btn emoji-toggle" aria-expanded={emojiOpen} aria-label="Emoji" onClick={() => setEmojiOpen((o) => !o)}>
          <span aria-hidden="true">😊</span>
        </button>
        <label className="sr-only" htmlFor={id}>{placeholder}</label>
        <input id={id} type="text" value={text} maxLength={280} autoComplete="off" placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="btn-primary" disabled={!text.trim()}>Send</button>
      </div>
    </form>
  );
}
