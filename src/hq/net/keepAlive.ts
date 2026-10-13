import { getSupabase, supabaseConfigured } from "./supabase";

/**
 * Keeps the office running while the app is minimised or in another tab, until it is closed.
 * - A held Web Lock tells the browser not to freeze or discard the page in the background.
 * - When the person comes back, a dropped connection is reopened straight away.
 * Phones may still pause a backgrounded app (iPhones especially); it reconnects on return.
 */
let started = false;
export function keepAlive() {
  if (started) return;
  started = true;
  try {
    const locks = (navigator as Navigator & { locks?: { request: (name: string, cb: () => Promise<void>) => Promise<void> } }).locks;
    void locks?.request("psd-lobby-keep-alive", () => new Promise<void>(() => { /* held until the page closes */ })).catch(() => undefined);
  } catch { /* older browser */ }
  if (!supabaseConfigured) return;
  const wake = () => {
    if (document.visibilityState !== "visible" && navigator.onLine === false) return;
    void getSupabase().then((sb) => { if (!sb.realtime.isConnected()) sb.realtime.connect(); }).catch(() => undefined);
  };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") wake(); });
  window.addEventListener("online", wake);
  window.addEventListener("focus", wake);
}
