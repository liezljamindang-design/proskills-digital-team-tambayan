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

export type SideTab = "chat" | "people" | "rooms";
/** "all" is the public room; any other thread id is the other person's id. */
export const PUBLIC = "all";
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
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;

  peers: Record<string, Peer>;
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
  helpOpen: false,
  setHelpOpen: (helpOpen) => set({ helpOpen }),

  peers: {},
  upsertPeer: (peer) => set((s) => {
    const old = s.peers[peer.id];
    // A profile update may arrive without a position: keep where they already are.
    const x = Number.isFinite(peer.x) ? peer.x : old?.x ?? 6.25;
    const y = Number.isFinite(peer.y) ? peer.y : old?.y ?? 9.45;
    return { peers: { ...s.peers, [peer.id]: { ...peer, x, y } } };
  }),
  movePeer: (id, x, y) => set((s) => (s.peers[id] ? { peers: { ...s.peers, [id]: { ...s.peers[id], x, y } } } : s)),
  removePeer: (id) => set((s) => {
    const peers = { ...s.peers };
    delete peers[id];
    return { peers };
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
    const watching = s.activeThread === thread && s.tab === "chat";
    return {
      threads: { ...s.threads, [thread]: [...(s.threads[thread] ?? []), line].slice(-200) },
      unread: watching || line.from === s.me?.id || line.system ? s.unread : { ...s.unread, [thread]: (s.unread[thread] ?? 0) + 1 },
    };
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
  overview: false,
  setOverview: (overview) => set({ overview }),
}));
