import { useEffect, useRef } from "react";
import { HQ } from "../config";
import { ZONES } from "../data/office";
import { myPosition, say } from "../net/session";
import { ChibiPortrait } from "../office/Chibi";
import { zoneAt } from "../office/engine";
import { statusOf } from "../status";
import { StatusPicker } from "./StatusPicker";
import { PUBLIC, useHq, type SideTab } from "../store";
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
  const active = useHq((s) => s.activeThread);
  const openThread = useHq((s) => s.openThread);
  const logRef = useRef<HTMLDivElement>(null);
  const lines = threads[active] ?? [];
  const isPublic = active === PUBLIC;
  const other = peers[active];
  const otherName = other?.name ?? lines.find((l) => l.from === active)?.name ?? "Someone";

  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [lines.length, active]);

  return (
    <div className="chatpane">
      <div className="thread-row" role="group" aria-label="Conversations">
        {Object.keys(threads).map((id) => {
          const name = id === PUBLIC ? "Everyone" : peers[id]?.name ?? threads[id].find((l) => l.from === id)?.name ?? "Someone";
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
          : other
            ? `Private chat with ${otherName}. Only the two of you see it.${["dnd", "sleeping", "meeting"].includes(statusOf(other, zoneAt(other.x, other.y)).id) ? ` They are ${statusOf(other, zoneAt(other.x, other.y)).label.toLowerCase()}, so they may reply later.` : ""}`
            : `${otherName} has left. They won't see new messages.`}
      </p>

      <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label={isPublic ? "Public room" : `Private chat with ${otherName}`}>
        {lines.length === 0 && <p className="muted">{isPublic ? "No messages yet. Say hi!" : `Say hi to ${otherName}.`}</p>}
        {lines.map((l) =>
          l.system ? (
            <p key={l.id} className="chat-system">{l.text}</p>
          ) : (
            <div key={l.id} className={`chat-line${l.from === me?.id ? " is-mine" : ""}`}>
              <p className="chat-meta">{l.from === me?.id ? "You" : l.name} · {l.time}</p>
              <p className="chat-text">{l.text}</p>
            </div>
          ),
        )}
      </div>

      <Composer
        id="side-composer"
        placeholder={isPublic ? "Message everyone" : `Message ${otherName}`}
        onSend={(text) => say(text, isPublic ? undefined : active)}
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
  const mine = myPosition();

  return (
    <>
    <StatusPicker />
    <ul className="people">
      {me && (
        <li>
          <ChibiPortrait look={me.look} size={44} />
          <div className="person-id"><strong>{me.name} (you)</strong><span>{me.role || "Team member"} · {roomName(mine.x, mine.y)}</span><StatusTag status={statusOf(me, myZone)} /></div>
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>Edit</button>
        </li>
      )}
      {list.map((p) => (
        <li key={p.id}>
          <ChibiPortrait look={p.look} size={44} />
          <div className="person-id"><strong>{p.name}</strong><span>{p.role || "Team member"} · {roomName(p.x, p.y)}</span><StatusTag status={statusOf(p, zoneAt(p.x, p.y))} /></div>
          <button type="button" className="btn-secondary" onClick={() => openThread(p.id)}>Message</button>
        </li>
      ))}
      {list.length === 0 && <li className="people-empty"><p className="muted">Nobody else is here yet. Invite a teammate, or open this page in a second tab to see how it looks with two people.</p></li>}
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
