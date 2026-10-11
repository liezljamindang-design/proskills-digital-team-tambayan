import { useEffect, useRef, useState, type FormEvent } from "react";
import { gifFromLink, GIPHY_KEY, searchGifs, shrinkPhoto, type GifResult } from "../media";
import { EmojiPicker } from "./EmojiPicker";

interface Props {
  id: string;
  placeholder: string;
  onSend: (text: string, image?: string) => void;
  /** Adds the photo and GIF buttons. */
  attachments?: boolean;
}

/** Message box with emoji and, where asked for, photo and GIF buttons. */
export function Composer({ id, placeholder, onSend, attachments }: Props) {
  const [text, setText] = useState("");
  const [panel, setPanel] = useState<"emoji" | "gif" | null>(null);
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() && !photo) return;
    onSend(text, photo || undefined);
    setText(""); setPhoto(""); setPanel(null); setError("");
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError("");
    try { setPhoto(await shrinkPhoto(file)); }
    catch (err) { setError(err instanceof Error ? err.message : "That picture could not be added."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <form className="composer" onSubmit={submit}>
      {panel === "emoji" && <EmojiPicker onPick={(emoji) => setText((t) => (t + emoji).slice(0, 280))} />}
      {panel === "gif" && <GifPicker onPick={(url) => { onSend(text, url); setText(""); setPanel(null); }} />}
      {photo && (
        <div className="attach-preview">
          <img src={photo} alt="Photo ready to send" />
          <button type="button" className="text-btn" onClick={() => setPhoto("")}>Remove</button>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="composer-row">
        <button type="button" className="icon-btn emoji-toggle" aria-expanded={panel === "emoji"} aria-label="Emoji" onClick={() => setPanel((p) => (p === "emoji" ? null : "emoji"))}>
          <span aria-hidden="true">😊</span>
        </button>
        {attachments && (
          <>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void pickPhoto(e.target.files?.[0])} />
            <button type="button" className="icon-btn emoji-toggle" aria-label="Attach a photo" title="Attach a photo" disabled={busy} onClick={() => fileRef.current?.click()}>
              <span aria-hidden="true">{busy ? "…" : "📷"}</span>
            </button>
            <button type="button" className="icon-btn emoji-toggle gif-toggle" aria-expanded={panel === "gif"} aria-label="Send a GIF" onClick={() => setPanel((p) => (p === "gif" ? null : "gif"))}>GIF</button>
          </>
        )}
        <label className="sr-only" htmlFor={id}>{placeholder}</label>
        <input id={id} type="text" value={text} maxLength={280} autoComplete="off" placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="btn-primary" disabled={!text.trim() && !photo}>Send</button>
      </div>
    </form>
  );
}

/** Search GIFs (when a Giphy key is set up) or paste a GIF link. Picking one sends it straight away. */
function GifPicker({ onPick }: { onPick: (url: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    if (!GIPHY_KEY) return;
    let stale = false;
    setState("loading");
    const timer = window.setTimeout(() => {
      searchGifs(query).then((r) => { if (!stale) { setResults(r); setState("idle"); } }).catch(() => { if (!stale) setState("failed"); });
    }, 350);
    return () => { stale = true; window.clearTimeout(timer); };
  }, [query]);

  function sendLink() {
    const url = gifFromLink(link);
    if (url) onPick(url); else setLinkError("Paste a GIF link from Giphy, Tenor or Imgur.");
  }

  return (
    <div className="gif-panel" role="group" aria-label="GIFs">
      {GIPHY_KEY ? (
        <>
          <input type="search" className="gif-search" placeholder="Search GIFs" aria-label="Search GIFs" value={query} onChange={(e) => setQuery(e.target.value)} />
          {state === "failed" && <p className="muted">GIF search isn't answering right now. Try again in a moment.</p>}
          {state === "idle" && results.length === 0 && <p className="muted">No GIFs found for that.</p>}
          <div className="gif-grid">
            {results.map((g) => (
              <button key={g.id} type="button" className="gif-btn" onClick={() => onPick(g.full)} aria-label={`Send GIF: ${g.title}`}><img src={g.preview} alt="" loading="lazy" /></button>
            ))}
          </div>
          <p className="gif-credit">Powered by GIPHY</p>
        </>
      ) : (
        <>
          <p className="muted">Paste a GIF link from Giphy, Tenor or Imgur.</p>
          <div className="composer-row">
            <input type="url" aria-label="GIF link" placeholder="https://giphy.com/gifs/…" value={link} onChange={(e) => { setLink(e.target.value); setLinkError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendLink(); } }} />
            <button type="button" className="btn-secondary" onClick={sendLink}>Send GIF</button>
          </div>
          {linkError && <p className="field-error" role="alert">{linkError}</p>}
        </>
      )}
    </div>
  );
}
