import { useEffect, useState } from "react";

/** The script file this page was loaded with. A new release has a different file name. */
const mine = () => document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')?.getAttribute("src") ?? "";

/**
 * Notices when a newer version of the site has been published. If the page is in the
 * background it waits; when the person comes back it offers a Refresh button.
 * Without this, people keep running an old copy until they happen to reload.
 */
export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const current = mine();
    if (!current) return; // local development: nothing to compare
    async function check() {
      try {
        const html = await (await fetch(`/?v=${Date.now()}`, { cache: "no-store" })).text();
        const latest = /<script[^>]+type="module"[^>]+src="([^"]*\/assets\/[^"]+)"/.exec(html)?.[1];
        if (!latest || latest === current) return;
        // Never reload by itself: the app keeps running while minimised (voice, music, chat).
        setReady(true);
      } catch { /* offline: try again later */ }
    }
    const timer = window.setInterval(() => void check(), 3 * 60 * 1000);
    const onShow = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onShow); };
  }, []);
  if (!ready) return null;
  return (
    <aside className="update-banner" role="status">
      <p>✨ A new version is ready.</p>
      <button type="button" onClick={() => window.location.reload()}>Refresh</button>
    </aside>
  );
}
