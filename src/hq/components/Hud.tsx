import { Coin } from "./Coin";
import { ChibiPortrait } from "../office/Chibi";
import { usePhoto } from "../photo";
import { HQ } from "../config";
import { liveMode } from "../net/session";
import { useHq } from "../store";
import { InstallButton } from "./InstallButton";
import { Bell } from "./Bell";
import { MusicToggle } from "./MusicToggle";

/** Top bar: the space's name, how many people are in, and the controls. */
export function Hud() {
  const theme = useHq((s) => s.theme);
  const toggleTheme = useHq((s) => s.toggleTheme);
  // People who chose "Appear offline" are not counted.
  const online = useHq((s) => Object.values(s.peers).filter((p) => p.status !== "offline").length + (s.joined && s.me?.status !== "offline" ? 1 : 0));
  const setEditing = useHq((s) => s.setEditingAvatar);
  const setHelpOpen = useHq((s) => s.setHelpOpen);
  const joined = useHq((s) => s.joined);
  const coins = useHq((s) => s.me?.coins ?? 0);
  const streak = useHq((s) => s.me?.streak ?? 0);
  const toast = useHq((s) => s.toast);
  const setShopOpen = useHq((s) => s.setShopOpen);

  const look = useHq((s) => s.me?.look);
  // The photo from the person's Google sign-in, if they have one. Otherwise their chibi.
  const [photo, noPhoto] = usePhoto(joined);

  return (
    <header className="hud">
      <div className="hud-brand">
        {HQ.logo ? (
          <img className="hud-logo" src={HQ.logo} alt="" />
        ) : (
          <svg className="hud-logo" viewBox="0 0 30 30" aria-hidden="true">
            <rect x="3" y="5" width="24" height="5.5" rx="2.75" fill="var(--green)" />
            <rect x="3" y="12.3" width="24" height="5.5" rx="2.75" fill="var(--lav)" />
            <rect x="3" y="19.6" width="16" height="5.5" rx="2.75" fill="var(--gold-soft)" />
          </svg>
        )}
        <span className="hud-name">{HQ.name}</span>
        <span className="demo-badge">{liveMode ? "Live" : "Preview mode"}</span>
      </div>

      <ul className="hud-status" aria-label="Status">
        <li><span className="hud-label">Online now</span><span className="hud-value"><i className="pip pip-ok" />{online} {online === 1 ? "person" : "people"}</span></li>
      </ul>

      <div className="hud-actions">
        {joined && (
          <button type="button" className="coin-btn" onClick={() => setShopOpen(true)} aria-label={`${coins} coins, ${streak} day streak. Open the shop`}>
            <Coin /> <span key={coins} className="coin-count">{coins}</span> <span className="coin-streak" aria-hidden="true">🔥 {streak}</span>
            {toast && <span key={toast.n} className="coin-toast" role="status">{toast.text}</span>}
          </button>
        )}
        <InstallButton />
        {joined && <Bell />}
        <MusicToggle />
        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.2A8 8 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
          )}
        </button>
        <button type="button" className="me-btn" onClick={() => setEditing(true)} aria-label="My profile" title="My profile">
          {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" onError={noPhoto} /> : look ? <ChibiPortrait look={look} size={34} /> : <span aria-hidden="true">🙂</span>}
        </button>
        <button type="button" className="text-btn" onClick={() => setHelpOpen(true)}>Help</button>
      </div>
    </header>
  );
}
