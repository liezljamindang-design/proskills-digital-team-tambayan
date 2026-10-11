import { useEffect, useRef, useState, type FormEvent } from "react";
import { gifFromLink, GIPHY_KEY, READY_GIFS, readyGifUrl, searchGifs, shrinkPhoto, type GifResult } from "../media";
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
  // The message box grows with what you type, up to three lines, then scrolls.
  const boxRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = boxRef.current; if (!el) return; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 86)}px`; }, [text]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [camOpen, setCamOpen] = useState(false);
  // Phones open their own camera app; computers get a small webcam window.
  const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

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
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; if (cameraRef.current) cameraRef.current.value = ""; }
  }

  return (
    <form className="composer" onSubmit={submit}>
      {panel === "emoji" && <EmojiPicker onPick={(emoji) => setText((t) => (t + emoji).slice(0, 280))} />}
      {camOpen && <CameraShot onClose={() => setCamOpen(false)} onShot={(file) => { setCamOpen(false); void pickPhoto(file); }} />}
      {panel === "gif" && <GifPicker onPick={(url) => { onSend(text, url); setText(""); setPanel(null); }} />}
      {photo && (
        <div className="attach-preview">
          <img src={photo} alt="Photo ready to send" />
          <button type="button" className="text-btn" onClick={() => setPhoto("")}>Remove</button>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className={`composer-row${attachments ? " is-stacked" : ""}`}>
        <div className="composer-tools">
        <button type="button" className="icon-btn emoji-toggle" aria-expanded={panel === "emoji"} aria-label="Emoji" onClick={() => setPanel((p) => (p === "emoji" ? null : "emoji"))}>
          <span aria-hidden="true">😊</span>
        </button>
        {attachments && (
          <>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void pickPhoto(e.target.files?.[0])} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void pickPhoto(e.target.files?.[0])} />
            <button type="button" className="icon-btn emoji-toggle" aria-label="Attach a photo from your gallery" title="Attach a photo" disabled={busy} onClick={() => fileRef.current?.click()}>
              <span aria-hidden="true">{busy ? "…" : "🖼️"}</span>
            </button>
            <button type="button" className="icon-btn emoji-toggle" aria-label="Take a photo with the camera" title="Take a photo" disabled={busy} onClick={() => (touch ? cameraRef.current?.click() : setCamOpen(true))}>
              <span aria-hidden="true">📷</span>
            </button>
            <button type="button" className="icon-btn emoji-toggle gif-toggle" aria-expanded={panel === "gif"} aria-label="Send a GIF" onClick={() => setPanel((p) => (p === "gif" ? null : "gif"))}>GIF</button>
          </>
        )}
        </div>
        <label className="sr-only" htmlFor={id}>{placeholder}</label>
        <textarea id={id} ref={boxRef} rows={1} value={text} maxLength={280} autoComplete="off" placeholder={placeholder} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
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
  const [broken, setBroken] = useState<string[]>([]);

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
      {!GIPHY_KEY && <input type="search" className="gif-search" placeholder="Search: laugh, love, party, thanks…" aria-label="Search ready GIFs" value={query} onChange={(e) => setQuery(e.target.value)} />}
      <div className="gif-grid ready-gifs">
        {READY_GIFS.filter((g) => !broken.includes(g.code) && (GIPHY_KEY || query.trim().toLowerCase().split(/\s+/).every((w) => g.words.includes(w)))).map((g) => (
          <button key={g.code} type="button" className="gif-btn" onClick={() => onPick(readyGifUrl(g.code))} aria-label={`Send GIF: ${g.words.split(" ")[0]}`}>
            <img src={readyGifUrl(g.code)} alt="" loading="lazy" onError={() => setBroken((list) => [...list, g.code])} />
          </button>
        ))}
      </div>
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
          <p className="muted">Or paste a GIF link from Giphy, Tenor or Imgur.</p>
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

/** A small webcam window for computers: live preview, then Capture. */
function CameraShot({ onShot, onClose }: { onShot: (file: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [problem, setProblem] = useState("");
  useEffect(() => {
    let stream: MediaStream | null = null, gone = false;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((s) => { if (gone) { s.getTracks().forEach((t) => t.stop()); return; } stream = s; if (videoRef.current) { videoRef.current.srcObject = s; void videoRef.current.play(); } })
      .catch(() => setProblem("The camera couldn't be opened. Allow camera access for this site in your browser, then try again."));
    if (!navigator.mediaDevices) setProblem("This browser can't use the camera here.");
    return () => { gone = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);
  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas"); canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    canvas.toBlob((blob) => { if (blob) onShot(new File([blob], "camera.jpg", { type: "image/jpeg" })); }, "image/jpeg", 0.9);
  }
  return (
    <div className="camera-shot" role="dialog" aria-label="Take a photo">
      {problem ? <p className="field-error" role="alert">{problem}</p> : <video ref={videoRef} playsInline muted />}
      <div className="room-actions">
        {!problem && <button type="button" className="btn-primary" onClick={capture}>📸 Capture</button>}
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
