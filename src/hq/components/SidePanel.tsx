import { useEffect, useRef, useState } from "react";
import { HQ } from "../config";
import { ZONES } from "../data/office";
import { myPosition, say, toggleReaction, togglePin } from "../net/session";
import { ChibiPortrait } from "../office/Chibi";
import { zoneAt } from "../office/engine";
import { statusOf } from "../status";
import { StatusPicker } from "./StatusPicker";
import { ARCADE, PUBLIC, useHq, type SideTab } from "../store";
import { batchesOf, displayName, REACTIONS, type Quote } from "../types";
import { Composer } from "./Composer";

const TABS: { id: SideTab; label: string }[] = [{ id: "chat", label: "Chat" }, { id: "people", label: "People" }, { id: "rooms", label: "Rooms" }];
const roomName = (x: number, y: number) => ZONES.find((z) => z.id === zoneAt(x, y))?.name ?? "Walking around";
function StatusTag({ status }: { status: ReturnType<typeof statusOf> }) {
  return <span className={`status-tag tone-${status.tone}`}><span aria-hidden="true">{status.emoji}</span> {status.label}</span>;
}

/** The column beside the office: chat (public room and private chats), who is here, and the rooms. */
export function SidePanel() {
  const tab = useHq((s) => s.tab);
  const setTab = useHq((s) => s.setTab);
  const unread = useHq((s) => s.unread);
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <aside className="side-panel pg-side" id="pg-side" aria-label="Chat, people and rooms">
      <div className="tabs" role="tablist" aria-label="Side panel">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`side-tab-${t.id}`} aria-selected={tab === t.id} aria-controls="side-tabpanel"
            className={tab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === "chat" && totalUnread > 0 && tab !== "chat" && <span className="badge">{totalUnread}</span>}
          </button>
        ))}
      </div>
      <div className="pg-tabpanel" id="side-tabpanel" role="tabpanel" aria-labelledby={`side-tab-${tab}`}>
        {tab === "chat" && <ChatPane />}
        {tab === "people" && <PeoplePane />}
        {tab === "rooms" && <RoomsPane />}
      </div>
    </aside>
  );
}

function ChatPane() {
  const me = useHq((s) => s.me);
  const peers = useHq((s) => s.peers);
  const threads = useHq((s) => s.threads);
  const unread = useHq((s) => s.unread);
  const rawActive = useHq((s) => s.activeThread);
  const openThread = useHq((s) => s.openThread);
  const logRef = useRef<HTMLDivElement>(null);
  // Rooms first (everyone, then your batch), then private chats. Other batches' rooms are never listed.
  const batchIds = me ? batchesOf(me).map((b) => `batch-${b}`) : [];
  const ids = [PUBLIC, ...batchIds, ...Object.keys(threads).filter((id) => id !== PUBLIC && id !== ARCADE && !id.startsWith("batch-"))];
  const active = rawActive.startsWith("batch-") && !batchIds.includes(rawActive) ? PUBLIC : rawActive;
  const isBatch = batchIds.includes(active);
  const batchNo = isBatch ? active.slice(6) : "";
  const lines = threads[active] ?? [];
  const isPublic = active === PUBLIC;
  const other = peers[active];
  const otherName = (other ? displayName(other) : undefined) ?? lines.find((l) => l.from === active)?.name ?? "Someone";

  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [lines.length, active]);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Quote | null>(null);
  const [pinsOpen, setPinsOpen] = useState(false);
  useEffect(() => { setReplyTo(null); setMenuFor(null); }, [active]);
  const pinned = lines.filter((l) => l.pinned);
  function jumpTo(id: string) {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.add("is-flash");
    window.setTimeout(() => el.classList.remove("is-flash"), 1600);
  }

  return (
    <div className="chatpane">
      <div className="thread-row" role="group" aria-label="Conversations">
        {ids.map((id) => {
          const name = id === PUBLIC ? "Everyone" : batchIds.includes(id) ? `Batch ${id.slice(6)}` : peers[id] ? displayName(peers[id]) : threads[id]?.find((l) => l.from === id)?.name ?? "Someone";
          return (
            <button key={id} type="button" className="thread-chip" aria-pressed={active === id} onClick={() => openThread(id)}>
              {id !== PUBLIC && <span className="lock" aria-hidden="true">●</span>}
              {name}
              {unread[id] > 0 && <span className="badge">{unread[id]}</span>}
            </button>
          );
        })}
      </div>

      <p className="chat-note">
        {isPublic
          ? "The public room. Everyone in the office sees this."
          : isBatch
          ? `Batch ${batchNo} room. Only members of Batch ${batchNo} who are online see this.`
          : other
            ? `Private chat with ${otherName}. Only the two of you see it.${["dnd", "sleeping", "meeting"].includes(statusOf(other, zoneAt(other.x, other.y)).id) ? ` They are ${statusOf(other, zoneAt(other.x, other.y)).label.toLowerCase()}, so they may reply later.` : ""}`
            : `${otherName} has left. They won't see new messages.`}
      </p>

      {pinned.length > 0 && (
        <div className="pins">
          <button type="button" className="pins-head" aria-expanded={pinsOpen} onClick={() => setPinsOpen((o) => !o)}>📌 {pinned.length} pinned {pinned.length === 1 ? "message" : "messages"} <span aria-hidden="true">{pinsOpen ? "▴" : "▾"}</span></button>
          {pinsOpen && (
            <ul>
              {pinned.map((l) => (
                <li key={l.id}>
                  <button type="button" className="pin-row" onClick={() => jumpTo(l.id)}><strong>{l.from === me?.id ? "You" : l.name}</strong> {l.text || "Photo"}</button>
                  <button type="button" className="text-btn" onClick={() => togglePin(active, l.id)} aria-label="Unpin this message">Unpin</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label={isPublic ? "Public room" : isBatch ? "Batch room" : `Private chat with ${otherName}`}>
        {lines.length === 0 && <p className="muted">{isPublic ? "No messages yet. Say hi!" : isBatch ? "No messages yet. Say hi to your batch!" : `Say hi to ${otherName}.`}</p>}
        {lines.map((l) =>
          l.system ? (
            <p key={l.id} className="chat-system">{l.text}</p>
          ) : (
            <div key={l.id} id={`msg-${l.id}`} className={`chat-line${l.from === me?.id ? " is-mine" : ""}${menuFor === l.id ? " is-open" : ""}`}>
              <p className="chat-meta">{l.pinned && <span title="Pinned">📌 </span>}{l.from === me?.id ? "You" : l.name} · {l.time}</p>
              {l.reply && (
                <button type="button" className="chat-quote" onClick={() => jumpTo(l.reply!.id)} aria-label={`In reply to ${l.reply.name}: ${l.reply.text}`}>
                  <strong>{l.reply.name}</strong> {l.reply.text}
                </button>
              )}
              {l.image && <a className="chat-image" href={l.image.startsWith("data:") ? undefined : l.image} target="_blank" rel="noopener noreferrer"><img src={l.image} alt={l.image.startsWith("data:") ? "Photo" : "GIF"} loading="lazy" /></a>}
              {l.text && <p className="chat-text" onClick={() => setMenuFor((m) => (m === l.id ? null : l.id))}>{l.text}</p>}
              {l.reactions && Object.keys(l.reactions).length > 0 && (
                <div className="chat-reacts">
                  {Object.entries(l.reactions).map(([emoji, who]) => (
                    <button key={emoji} type="button" className="react-chip" aria-pressed={who.includes(me?.id ?? "")} onClick={() => toggleReaction(active, l.id, emoji)}
                      title={who.map((id) => (id === me?.id ? "You" : peers[id] ? displayName(peers[id]) : "Someone")).join(", ")}>
                      {emoji} {who.length}
                    </button>
                  ))}
                </div>
              )}
              <div className="chat-actions" role="group" aria-label="Message actions">
                {REACTIONS.map((emoji) => (
                  <button key={emoji} type="button" onClick={() => { toggleReaction(active, l.id, emoji); setMenuFor(null); }} aria-label={`React ${emoji}`}>{emoji}</button>
                ))}
                <button type="button" className="act-text" onClick={() => { setReplyTo({ id: l.id, name: l.from === me?.id ? "You" : l.name, text: (l.text || (l.image ? "Photo" : "")).slice(0, 90) }); setMenuFor(null); document.getElementById("side-composer")?.focus(); }}>Reply</button>
                <button type="button" className="act-text" onClick={() => { togglePin(active, l.id); setMenuFor(null); }}>{l.pinned ? "Unpin" : "Pin"}</button>
              </div>
            </div>
          ),
        )}
      </div>

      {replyTo && (
        <div className="reply-banner">
          <span>Replying to <strong>{replyTo.name}</strong>: {replyTo.text}</span>
          <button type="button" className="text-btn" onClick={() => setReplyTo(null)} aria-label="Cancel reply">✕</button>
        </div>
      )}
      <Composer
        id="side-composer"
        placeholder={isPublic ? "Message everyone" : isBatch ? `Message Batch ${batchNo}` : `Message ${otherName}`}
        attachments
        onSend={(text, image) => { say(text, isPublic ? undefined : active, image, replyTo ?? undefined); setReplyTo(null); }}
      />
    </div>
  );
}

function PeoplePane() {
  const me = useHq((s) => s.me);
  const peers = useHq((s) => s.peers);
  const openThread = useHq((s) => s.openThread);
  const setEditing = useHq((s) => s.setEditingAvatar);
  const list = Object.values(peers).sort((a, b) => a.name.localeCompare(b.name));
  const myZone = useHq((s) => s.myZone);
  const away = useHq((s) => s.away);
  const gone = Object.values(away).filter((a) => a.id !== me?.id && !peers[a.id]).sort((a, b) => b.leftAt - a.leftAt);
  const mine = myPosition();

  return (
    <>
    <StatusPicker />
    <ul className="people">
      {me && (
        <li>
          <ChibiPortrait look={me.look} size={44} />
          <div className="person-id"><strong><i className="pip pip-ok" aria-hidden="true" />{displayName(me)} (you) <span className="presence">Online</span>{me.admin && <span className="admin-tag">Admin</span>}</strong><span>{me.role || "Team member"}{batchesOf(me).length ? ` · Batch ${batchesOf(me).join(", ")}` : ""} · {roomName(mine.x, mine.y)}</span><StatusTag status={statusOf(me, myZone)} /></div>
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>Edit</button>
        </li>
      )}
      {list.map((p) => (
        <li key={p.id}>
          <ChibiPortrait look={p.look} size={44} />
          <div className="person-id"><strong><i className="pip pip-ok" aria-hidden="true" />{displayName(p)} <span className="presence">Online</span>{p.admin && <span className="admin-tag">Admin</span>}</strong><span>{p.role || "Team member"}{batchesOf(p).length ? ` · Batch ${batchesOf(p).join(", ")}` : ""} · {roomName(p.x, p.y)}{p.act?.radio ? ` · 🎧 ${String(p.act.radio).slice(0, 30)}` : ""}</span><StatusTag status={statusOf(p, zoneAt(p.x, p.y))} /></div>
          <button type="button" className="btn-secondary" onClick={() => openThread(p.id)}>Message</button>
        </li>
      ))}
      {gone.map((p) => (
        <li key={p.id} className="is-offline">
          <ChibiPortrait look={p.look} size={44} />
          <div className="person-id">
            <strong><i className="pip pip-off" aria-hidden="true" />{p.name} <span className="presence">Offline</span></strong>
            <span>{p.role || "Team member"} · left {new Date(p.leftAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
          </div>
        </li>
      ))}
      {list.length === 0 && gone.length === 0 && <li className="people-empty"><p className="muted">Nobody else is here yet. Invite a teammate, or open this page in a second tab to see how it looks with two people.</p></li>}
    </ul>
    </>
  );
}

function RoomsPane() {
  const peers = useHq((s) => s.peers);
  const selected = useHq((s) => s.selectedZone);
  const walkToZone = useHq((s) => s.walkToZone);
  const inRoom = (id: string) => Object.values(peers).filter((p) => zoneAt(p.x, p.y) === id);

  return (
    <ul className="rooms">
      {ZONES.map((z) => {
        const here = inRoom(z.id);
        return (
          <li key={z.id} className={selected === z.id ? "is-here" : ""}>
            <button type="button" className="room-row" onClick={() => walkToZone(z.id)}>
              <span className="directory-key">{z.key}</span>
              <span className="room-id"><strong>{z.name}</strong><span>{z.summary}</span></span>
              {here.length > 0 && <span className="badge" aria-label={`${here.length} here`}>{here.length}</span>}
            </button>
            {z.id === "huddle" && HQ.meetingUrl && <a className="btn-secondary room-action" href={HQ.meetingUrl} target="_blank" rel="noopener noreferrer" onClick={() => walkToZone("huddle")}>Join the Zoom meeting</a>}
            {z.id === "game" && <button type="button" className="btn-secondary room-action" onClick={() => walkToZone("game")}>Enter the arcade</button>}
          </li>
        );
      })}
    </ul>
  );
}
