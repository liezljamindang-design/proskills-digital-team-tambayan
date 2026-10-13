import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { HQ } from "../config";
import { say } from "../net/session";
import { zoneAt } from "../office/engine";
import { PersonFace } from "../office/Chibi";
import { statusOf } from "../status";
import { PUBLIC, useHq } from "../store";
import { displayName, type ChatLine } from "../types";

/**
 * "Float": a small Lobby window that stays on top of other apps, like a video call's mini window.
 * - Chrome and Edge on a computer: a live mini lobby (who's online, the latest chat, and a box to reply).
 * - Phones and other browsers that can float videos: a picture of the same card, refreshed every second.
 * Browsers only allow this after a tap, so it opens from the ⧉ button (and by itself when the
 * browser offers to float the page on minimise).
 */
type DocPip = { requestWindow: (o: { width: number; height: number }) => Promise<Window> };
const docPip = () => (window as unknown as { documentPictureInPicture?: DocPip }).documentPictureInPicture;
export const canFloat = () => Boolean(docPip()) || (typeof document !== "undefined" && "pictureInPictureEnabled" in document && document.pictureInPictureEnabled);

let openFloat: (() => void) | null = null;

export function FloatButton() {
  if (!canFloat()) return null;
  return (
    <button type="button" className="icon-btn float-btn" title="Float: keep a mini Lobby on top of your other apps" aria-label="Float the Lobby in a mini window" onClick={() => openFloat?.()}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="11.5" y="10.5" width="7.5" height="5.5" rx="1.2" fill="currentColor" /></svg>
    </button>
  );
}

/** Keeps the floating window's content in step with the office. Mounted once. */
export function FloatHost() {
  const [pipWin, setPipWin] = useState<Window | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let timer = 0;
    async function open() {
      const dp = docPip();
      if (dp) {
        if (pipWin) { pipWin.focus(); return; }
        try {
          const w = await dp.requestWindow({ width: 340, height: 500 });
          // Bring the page's styles along so the mini window looks like the app.
          for (const node of document.querySelectorAll('style, link[rel="stylesheet"]')) w.document.head.appendChild(node.cloneNode(true));
          w.document.documentElement.dataset.theme = document.documentElement.dataset.theme ?? "";
          w.document.title = HQ.name;
          w.document.body.className = "float-body"; w.document.body.style.fontFamily = getComputedStyle(document.body).fontFamily;
          w.addEventListener("pagehide", () => setPipWin(null));
          setPipWin(w);
        } catch { /* the browser said no */ }
        return;
      }
      // Video fallback: draw the card on a canvas and float it as a video.
      try {
        if (document.pictureInPictureElement) { await document.exitPictureInPicture(); return; }
        const canvas = canvasRef.current ?? document.createElement("canvas"); canvasRef.current = canvas;
        canvas.width = 360; canvas.height = 480; drawCard(canvas);
        const video = videoRef.current ?? document.createElement("video"); videoRef.current = video;
        video.muted = true; video.playsInline = true;
        if (!video.srcObject) video.srcObject = (canvas as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(2);
        await video.play();
        await video.requestPictureInPicture();
        window.clearInterval(timer);
        timer = window.setInterval(() => { if (document.pictureInPictureElement) drawCard(canvas); else window.clearInterval(timer); }, 1000);
      } catch { /* not allowed here */ }
    }
    openFloat = () => void open();
    // Some browsers offer to float a page automatically when you switch away from it.
    try { navigator.mediaSession?.setActionHandler("enterpictureinpicture" as MediaSessionAction, () => void open()); } catch { /* not supported */ }
    return () => { openFloat = null; window.clearInterval(timer); };
  }, [pipWin]);

  return pipWin ? createPortal(<MiniLobby onBack={() => { window.focus(); pipWin.close(); }} />, pipWin.document.body) : null;
}

function useLobbyState() {
  const me = useHq((s) => s.me);
  const peers = useHq((s) => s.peers);
  const lines = useHq((s) => s.threads[PUBLIC] ?? []);
  const people = Object.values(peers).filter((p) => p.status !== "offline").sort((a, b) => a.name.localeCompare(b.name));
  return { me, people, lines: lines.filter((l) => !l.system).slice(-6) };
}

function MiniLobby({ onBack }: { onBack: () => void }) {
  const { me, people, lines } = useLobbyState();
  const [text, setText] = useState("");
  const send = (e: FormEvent) => { e.preventDefault(); if (text.trim()) { say(text.trim()); setText(""); } };
  return (
    <div className="mini-lobby">
      <header><img src={HQ.logo} alt="" /><strong>{HQ.name}</strong><span className="mini-online"><i className="pip pip-ok" />{people.length + (me ? 1 : 0)} online</span></header>
      <ul className="mini-people">
        {people.slice(0, 12).map((p) => <li key={p.id} title={`${displayName(p)} · ${statusOf(p, zoneAt(p.x, p.y)).label}`}><PersonFace look={p.look} photo={p.photo} size={30} /><span>{statusOf(p, zoneAt(p.x, p.y)).emoji}</span></li>)}
        {!people.length && <li className="mini-empty">No one else is here right now.</li>}
      </ul>
      <ol className="mini-chat">
        {lines.map((l: ChatLine) => <li key={l.id}><b>{l.from === me?.id ? "You" : l.name}:</b> {l.image && !l.text ? "📷 photo" : l.text}</li>)}
        {!lines.length && <li className="mini-empty">No messages yet.</li>}
      </ol>
      <form onSubmit={send}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message everyone" aria-label="Message everyone" /><button type="submit">Send</button></form>
      <button type="button" className="mini-back" onClick={onBack}>Back to the Lobby</button>
    </div>
  );
}

/** The phone version: the same card drawn as a picture. */
function drawCard(canvas: HTMLCanvasElement) {
  const c = canvas.getContext("2d");
  if (!c) return;
  const s = useHq.getState(), me = s.me;
  const people = Object.values(s.peers).filter((p) => p.status !== "offline");
  const lines = (s.threads[PUBLIC] ?? []).filter((l) => !l.system).slice(-6);
  const dark = document.documentElement.dataset.theme === "dark";
  c.fillStyle = dark ? "#10141c" : "#ffffff"; c.fillRect(0, 0, 360, 480);
  c.fillStyle = "#15803d"; c.fillRect(0, 0, 360, 56);
  c.fillStyle = "#ffffff"; c.font = "800 20px system-ui, sans-serif"; c.textBaseline = "middle"; c.fillText(HQ.name, 16, 28, 240);
  c.font = "700 15px system-ui, sans-serif"; c.textAlign = "right"; c.fillText(`🟢 ${people.length + (me ? 1 : 0)} online`, 346, 28); c.textAlign = "left";
  c.fillStyle = dark ? "#e9ecef" : "#10141c"; c.font = "600 14px system-ui, sans-serif";
  const names = people.slice(0, 6).map((p) => `${statusOf(p, zoneAt(p.x, p.y)).emoji} ${p.name}`);
  names.forEach((n, i) => c.fillText(n, 16 + (i % 2) * 170, 80 + Math.floor(i / 2) * 24, 160));
  let y = 170;
  c.fillStyle = dark ? "#2a3140" : "#e9ecef"; c.fillRect(16, y - 14, 328, 1); y += 6;
  for (const l of lines) {
    const who = l.from === me?.id ? "You" : l.name, text = l.image && !l.text ? "📷 photo" : l.text;
    c.fillStyle = "#15803d"; c.font = "800 14px system-ui, sans-serif"; c.fillText(`${who}:`, 16, y, 110);
    c.fillStyle = dark ? "#e9ecef" : "#10141c"; c.font = "500 14px system-ui, sans-serif";
    const words = text.split(" "); let row = "", rows = 0;
    for (const w of words) { const next = row ? `${row} ${w}` : w; if (c.measureText(next).width > 320) { c.fillText(row, 16, y + 20 + rows * 18); row = w; rows++; if (rows > 1) break; } else row = next; }
    if (rows < 2 && row) { c.fillText(row, 16, y + 20 + rows * 18); rows++; }
    y += 26 + rows * 18;
    if (y > 450) break;
  }
  if (!lines.length) { c.fillStyle = "#868e96"; c.fillText("No messages yet.", 16, y + 10); }
}
