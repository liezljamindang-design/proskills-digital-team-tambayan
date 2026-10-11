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
