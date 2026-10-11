import { useEffect, useState } from "react";

interface InstallEvent extends Event { prompt: () => Promise<void> }

// The browser's offer can arrive before React is ready, so it is caught here.
let offer: InstallEvent | null = null;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((l) => l());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); offer = e as InstallEvent; tell(); });
  window.addEventListener("appinstalled", () => { offer = null; tell(); });
}

const installed = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
const isApple = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const KEY = "tambayan-install-hidden";
const hidden = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

function useInstall() {
  const [, bump] = useState(0);
  useEffect(() => { const l = () => bump((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  // iPhones never offer a prompt: the person adds it from the Share menu instead.
  const mode: "prompt" | "apple" | "menu" | null = installed() ? null : offer ? "prompt" : isApple() ? "apple" : "menu";
  const install = () => { const o = offer; offer = null; tell(); void o?.prompt(); };
  return { mode, install };
}

const AppleSteps = () => (
  <ol>
    <li>Open this page in Safari.</li>
    <li>Tap the Share button (the square with an arrow).</li>
    <li>Choose “Add to Home Screen”, then “Add”.</li>
  </ol>
);

const MenuSteps = () => (
  <ol>
    <li>Open this page in Chrome or Edge.</li>
    <li>Open the browser menu (the three dots).</li>
    <li>Choose “Install app” or “Add to Home screen”.</li>
  </ol>
);

/** Top-bar button on computers. */
export function InstallButton() {
  const { mode, install } = useInstall();
  const [open, setOpen] = useState(false);
  if (!mode) return null;
  return (
    <>
      <button type="button" className="text-btn install-btn" aria-expanded={mode === "apple" ? open : undefined} onClick={() => (mode === "prompt" ? install() : setOpen(!open))}>Install app</button>
      {open && mode === "apple" && <div className="install-pop" role="dialog" aria-label="Install on iPhone or iPad"><strong>Install on iPhone or iPad</strong><AppleSteps /></div>}
    </>
  );
}

/** Slim strip under the top bar on phones. */
export function InstallBanner() {
  const { mode, install } = useInstall();
  const [gone, setGone] = useState(hidden);
  const [steps, setSteps] = useState(false);
  if (!mode || gone) return null;
  const dismiss = () => { try { localStorage.setItem(KEY, "1"); } catch { /* private mode */ } setGone(true); };
  return (
    <aside className="install-banner" aria-label="Install the app" style={steps ? { flexWrap: "wrap" } : undefined}>
      <p>📲 Get the Tambayan app on your phone or computer</p>
      <button type="button" onClick={() => (mode === "prompt" ? install() : setSteps(!steps))}>{mode === "prompt" ? "Install" : "How"}</button>
      <button type="button" className="install-x" aria-label="Hide" onClick={dismiss}>×</button>
      {steps && mode !== "prompt" && <div className="install-steps">{mode === "apple" ? <AppleSteps /> : <MenuSteps />}</div>}
    </aside>
  );
}

/** The "Get app" tab: one card for computers, one for phones. */
export function AppPane() {
  const { mode, install } = useInstall();
  const here = window.matchMedia("(max-width: 900px)").matches || isApple() ? "phone" : "pc";
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState(false);
  const link = window.location.origin;
  const copy = () => { void navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  const button = (kind: "pc" | "phone") => {
    if (!mode) return <p className="app-done">✅ Already installed on this device.</p>;
    if (kind !== here) return <p className="muted">Open this page on your {kind === "pc" ? "computer" : "phone"} to install it there.</p>;
    if (mode === "prompt") return <button type="button" className="btn-primary" onClick={install}>⬇ Download for {kind === "pc" ? "PC" : "mobile"}</button>;
    return <p className="muted">Follow the steps above on this device.</p>;
  };
  return (
    <div className="app-pane">
      <div className="app-top">
        {!mode ? <p className="app-done">✅ Already installed on this device.</p> : (
          <button type="button" className="btn-primary app-download" onClick={() => { if (mode === "prompt") install(); else setHint(true); }}>⬇ Download the app{here === "pc" ? " for PC" : " for mobile"}</button>
        )}
        {hint && mode && mode !== "prompt" && <p className="app-hint" role="status">{mode === "apple" ? "iPhone and iPad don't allow a one-tap download. Follow the iPhone steps below: Share, then “Add to Home Screen”." : "This browser didn't offer a one-tap download. Use the steps below: browser menu, then “Install app” or “Add to Home screen”. Chrome and Edge work best."}</p>}
      </div>
      <p className="muted">Free, no app store needed. It opens in its own window with the owl icon.</p>
      <section className="app-card">
        <h3>💻 Download on PC</h3>
        <ol>
          <li>Open this page in Chrome or Edge.</li>
          <li>Click the install icon at the right of the address bar, or the browser menu → “Install app”.</li>
          <li>On a Mac with Safari: File → “Add to Dock”.</li>
        </ol>
        {button("pc")}
      </section>
      <section className="app-card">
        <h3>📱 Download on mobile</h3>
        <p><strong>Android</strong></p>
        <ol><li>Open this page in Chrome.</li><li>Tap the three dots → “Install app” or “Add to Home screen”.</li></ol>
        <p><strong>iPhone or iPad</strong></p>
        <AppleSteps />
        {button("phone")}
      </section>
      <section className="app-card">
        <h3>🔗 Send the link to your phone</h3>
        <p className="app-link">{link}</p>
        <button type="button" className="btn-secondary" onClick={copy}>{copied ? "Copied!" : "Copy link"}</button>
      </section>
    </div>
  );
}
