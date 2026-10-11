import { useHq, type SideTab } from "../store";

const ICONS: Record<string, string> = {
  office: "M4 20V8l8-4 8 4v12M9 20v-5h6v5M4 20h16",
  chat: "M5 6h14v9H10l-4 4v-4H5z",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M16 11a2.5 2.5 0 1 0 0-5M17 14.6c1.8.4 3 1.8 3.5 4.4",
  rooms: "M5 7h14M5 12h14M5 17h9",
  app: "M12 4v10M8 10.5l4 4 4-4M5 19h14",
  game: "M7 9h10a4 4 0 0 1 4 4v1a3 3 0 0 1-5.5 1.6L15 15H9l-.5.6A3 3 0 0 1 3 14v-1a4 4 0 0 1 4-4ZM8 11.5v3M6.5 13h3",
};

/** Phone and tablet navigation. The side panel opens as a sheet above this bar. */
export function BottomNav() {
  const tab = useHq((s) => s.tab);
  const sheet = useHq((s) => s.sheetOpen);
  const gameOpen = useHq((s) => s.gameOpen);
  const online = useHq((s) => Object.values(s.peers).filter((p) => p.status !== "offline").length + (s.joined && s.me?.status !== "offline" ? 1 : 0));
  const unread = useHq((s) => Object.values(s.unread).reduce((a, b) => a + b, 0));

  const show = (t: SideTab) => useHq.setState({ tab: t, sheetOpen: true });
  const items = [
    { id: "office", label: "Office", current: !sheet && !gameOpen, onClick: () => { useHq.setState({ sheetOpen: false }); window.scrollTo({ top: 0 }); } },
    { id: "chat", label: "Chat", current: sheet && tab === "chat", onClick: () => show("chat") },
    { id: "people", label: "People", current: sheet && tab === "people", onClick: () => show("people") },
    { id: "rooms", label: "Rooms", current: sheet && tab === "rooms", onClick: () => show("rooms") },
    { id: "app", label: "Get app", current: sheet && tab === "app", onClick: () => show("app") },
    { id: "game", label: "Arcade", current: gameOpen && !sheet, onClick: () => { useHq.setState({ sheetOpen: false }); useHq.getState().walkToZone("game"); window.scrollTo({ top: 0 }); } },
  ];

  return (
    <nav className="bottom-nav" aria-label="Sections">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={item.onClick} aria-current={item.current ? "page" : undefined}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d={ICONS[item.id]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>{item.label}{item.id === "chat" && unread > 0 ? ` (${unread})` : ""}{item.id === "people" ? ` (${online})` : ""}</span>
        </button>
      ))}
    </nav>
  );
}
