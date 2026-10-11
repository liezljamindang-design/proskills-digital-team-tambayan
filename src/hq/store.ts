import { create } from "zustand";
import { DEFAULT_LOOK } from "./office/Chibi";
import type { ChatLine, Peer, Profile, ThemeChoice, ZoneId } from "./types";

const read = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* not remembered */ } };

function savedProfile(): Profile | null {
  try {
    const p = JSON.parse(read("playground.profile") ?? "null");
    return p && typeof p.name === "string" && p.look ? { ...p, act: undefined, look: { ...DEFAULT_LOOK, ...p.look } } : null;
  } catch { return null; }
}
function initialTheme(): ThemeChoice {
  const theme: ThemeChoice = read("playground.theme") === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  return theme;
}

export interface Away { id: string; name: string; firstName?: string; role: string; look: Profile["look"]; leftAt: number; batches?: number[]; admin?: boolean }
function savedAway(): Record<string, Away> {
  try { const a = JSON.parse(read("playground.away") ?? "{}"); return a && typeof a === "object" ? a : {}; } catch { return {}; }
}
const keepAway = (away: Record<string, Away>) => {
  // Remember the fifty most recent, so the list cannot grow without end.
  const kept = Object.fromEntries(Object.values(away).sort((a, b) => b.leftAt - a.leftAt).slice(0, 50).map((a) => [a.id, a]));
  write("playground.away", JSON.stringify(kept));
  return kept;
};

/** How the 3D office is looked at. */
export type CamMode = "iso" | "free" | "third" | "front" | "first";
function canDo3d(): boolean {
  try { const c = document.createElement("canvas"); return Boolean(c.getContext("webgl2") ?? c.getContext("webgl")); } catch { return false; }
}

export type SideTab = "chat" | "people" | "rooms";
/** "all" is the public room; any other thread id is the other person's id. */
export const PUBLIC = "all";
/** The chat that only people inside the arcade see. */
export const ARCADE = "arcade";
export interface Bubble { text: string; private: boolean; until: number }

interface State {
  theme: ThemeChoice;
  toggleTheme: () => void;

  /** Who I am. Null until the join screen is completed. */
  me: Profile | null;
  setMe: (me: Profile) => void;
  joined: boolean;
  setJoined: (joined: boolean) => void;
  editingAvatar: boolean;
  setEditingAvatar: (open: boolean) => void;
  /** The teammate whose action card is open (wave, high-five, message). */
  selectedPeer: string | null;
  selectPeer: (id: string | null) => void;
  /** Ping-pong: who I am inviting, who invited me, or who I am playing. */
  pong: { opp: string; name: string; stage: "inviting" | "invited" | "playing"; host: boolean } | null;
  shopOpen: boolean;
  setShopOpen: (open: boolean) => void;
  /** A short "+10 coins" style message beside the coin counter. */
  toast: { text: string; n: number } | null;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;

  peers: Record<string, Peer>;
  /** People this browser has seen who are not in the office right now, with when they left. */
  away: Record<string, Away>;
  /** Adds members from the saved team list, so people who are not here still show as offline. */
  mergeAway: (members: Away[]) => void;
  upsertPeer: (peer: Peer) => void;
  movePeer: (id: string, x: number, y: number) => void;
  removePeer: (id: string) => void;

  tab: SideTab;
  setTab: (tab: SideTab) => void;
  /** The arcade view, shown over the floor while you are inside the Recreation Room. */
  gameOpen: boolean;
  setGameOpen: (open: boolean) => void;
  /** Phones only: whether the side panel is showing as a sheet over the office. */
  sheetOpen: boolean;

  threads: Record<string, ChatLine[]>;
  unread: Record<string, number>;
  activeThread: string;
  openThread: (id: string) => void;
  addLine: (thread: string, line: ChatLine) => void;
  /** Puts saved messages in front of what has arrived live, without duplicates. */
  mergeHistory: (thread: string, lines: ChatLine[]) => void;
  /** Changes one message in a thread, for reactions and pins. */
  patchLine: (thread: string, id: string, change: (line: ChatLine) => ChatLine) => void;

  /** Speech bubbles currently showing, by person id. */
  bubbles: Record<string, Bubble>;
  showBubble: (id: string, text: string, isPrivate: boolean) => void;

  /** The room I am standing in, which drives my automatic status. */
  myZone: ZoneId | null;
  setMyZone: (zone: ZoneId | null) => void;
  selectedZone: ZoneId | null;
  selectZone: (id: ZoneId | null) => void;
  walkRequest: { zone: ZoneId } | null;
  walkToZone: (zone: ZoneId) => void;
  /** Asks the movement loop to seat you on the sofa or stand you back up. */
  poseRequest: { pose: "sit" | "stand"; seat?: string } | null;
  requestPose: (pose: "sit" | "stand", seat?: string) => void;
  /** The seat you are standing next to, if any. */
  nearSeat: string | null;
  /** True when the browser refused to open the meeting by itself. */
  meetingBlocked: boolean;
  /** How close the camera sits while it follows you. 1 is the normal distance. */
  zoom: number;
  zoomBy: (factor: number) => void;
  /** True for the 3D office, false for the flat drawing. */
  view3d: boolean;
  setView3d: (on: boolean) => void;
  camMode: CamMode;
  setCamMode: (mode: CamMode) => void;
  overview: boolean;
  setOverview: (overview: boolean) => void;
}

export const useHq = create<State>((set, get) => ({
  theme: initialTheme(),
  toggleTheme: () => {
    const theme: ThemeChoice = get().theme === "dark" ? "light" : "dark";
    write("playground.theme", theme);
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },

  me: savedProfile(),
  setMe: (me) => { write("playground.profile", JSON.stringify(me)); set({ me }); },
  joined: false,
  setJoined: (joined) => set({ joined }),
  editingAvatar: false,
  setEditingAvatar: (editingAvatar) => set({ editingAvatar }),
  selectedPeer: null,
  selectPeer: (selectedPeer) => set({ selectedPeer }),
  pong: null,
  shopOpen: false,
  setShopOpen: (shopOpen) => set({ shopOpen }),
  toast: null,
  helpOpen: false,
  setHelpOpen: (helpOpen) => set({ helpOpen }),

  peers: {},
  away: savedAway(),
  mergeAway: (members) => set((s) => {
    const away = { ...s.away };
    for (const m of members) if (m.id !== s.me?.id && !s.peers[m.id]) away[m.id] = { ...m, leftAt: Math.max(m.leftAt, away[m.id]?.leftAt ?? 0) };
    return { away };
  }),
  upsertPeer: (peer) => set((s) => {
    const old = s.peers[peer.id];
    // A profile update may arrive without a position: keep where they already are.
    const x = Number.isFinite(peer.x) ? peer.x : old?.x ?? 6.25;
    const y = Number.isFinite(peer.y) ? peer.y : old?.y ?? 9.45;
    let away = s.away;
    if (away[peer.id]) { away = { ...away }; delete away[peer.id]; away = keepAway(away); }
    return { away, peers: { ...s.peers, [peer.id]: { ...peer, x, y } } };
  }),
  movePeer: (id, x, y) => set((s) => (s.peers[id] ? { peers: { ...s.peers, [id]: { ...s.peers[id], x, y } } } : s)),
  removePeer: (id) => set((s) => {
    const gone = s.peers[id];
    const peers = { ...s.peers };
    delete peers[id];
    const away = gone ? keepAway({ ...s.away, [id]: { id, name: gone.name, firstName: gone.firstName, role: gone.role, look: gone.look, leftAt: Date.now(), batches: gone.batches ?? (gone.batch ? [gone.batch] : undefined), admin: gone.admin } }) : s.away;
    return { peers, away };
  }),

  tab: "chat",
  setTab: (tab) => set({ tab }),
  gameOpen: false,
  setGameOpen: (gameOpen) => set({ gameOpen }),
  sheetOpen: false,

  threads: { [PUBLIC]: [] },
  unread: {},
  activeThread: PUBLIC,
  openThread: (id) => set((s) => ({
    activeThread: id, tab: "chat", sheetOpen: true,
    threads: s.threads[id] ? s.threads : { ...s.threads, [id]: [] },
    unread: { ...s.unread, [id]: 0 },
  })),
  addLine: (thread, line) => set((s) => {
    const watching = thread === ARCADE || (s.activeThread === thread && s.tab === "chat");
    return {
      threads: { ...s.threads, [thread]: [...(s.threads[thread] ?? []), line].slice(-200) },
      unread: watching || line.from === s.me?.id || line.system ? s.unread : { ...s.unread, [thread]: (s.unread[thread] ?? 0) + 1 },
    };
  }),

  mergeHistory: (thread, lines) => set((s) => {
    const live = s.threads[thread] ?? [];
    const have = new Set(live.map((l) => l.id));
    return { threads: { ...s.threads, [thread]: [...lines.filter((l) => !have.has(l.id)), ...live].slice(-300) } };
  }),
  patchLine: (thread, id, change) => set((s) => {
    const lines = s.threads[thread];
    if (!lines?.some((l) => l.id === id)) return s;
    return { threads: { ...s.threads, [thread]: lines.map((l) => (l.id === id ? change(l) : l)) } };
  }),

  bubbles: {},
  showBubble: (id, text, isPrivate) => {
    const until = Date.now() + 6500;
    set((s) => ({ bubbles: { ...s.bubbles, [id]: { text, private: isPrivate, until } } }));
    window.setTimeout(() => set((s) => {
      if (s.bubbles[id]?.until !== until) return s; // a newer bubble replaced this one
      const bubbles = { ...s.bubbles };
      delete bubbles[id];
      return { bubbles };
    }), 6600);
  },

  myZone: "lobby",
  setMyZone: (myZone) => set({ myZone }),
  selectedZone: null,
  selectZone: (selectedZone) => set({ selectedZone }),
  walkRequest: null,
  walkToZone: (zone) => set({ selectedZone: zone, walkRequest: { zone } }),
  poseRequest: null,
  requestPose: (pose, seat) => set({ poseRequest: { pose, seat } }),
  nearSeat: null,
  meetingBlocked: false,
  zoom: Math.min(2.2, Math.max(0.5, Number(read("playground.zoom")) || 1)),
  zoomBy: (factor) => {
    const zoom = Math.min(2.2, Math.max(0.5, +(get().zoom * factor).toFixed(3)));
    write("playground.zoom", String(zoom));
    set({ zoom, overview: false });
  },
  view3d: read("playground.view") !== "2d" && canDo3d(),
  setView3d: (view3d) => { write("playground.view", view3d ? "3d" : "2d"); set({ view3d, overview: false }); },
  camMode: (["iso", "free", "third", "front", "first"].includes(read("playground.cam") ?? "") ? read("playground.cam") : "iso") as CamMode,
  setCamMode: (camMode) => { write("playground.cam", camMode); set({ camMode, overview: false }); },
  overview: false,
  setOverview: (overview) => set({ overview }),
}));
