import { useHq } from "../store";
import { batchesOf } from "../types";
import { getSupabase, supabaseConfigured } from "./supabase";

/**
 * Notifications on the phone or computer for new messages, even with the app closed.
 * The browser gives this device an address; we save it against the member, and the
 * server (api/push.js) sends to it. Nothing secret is handled in the page.
 */
export type PushScope = "all" | "direct";
export const pushSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const TABLE = "tambayan_push";
const toBytes = (base64: string) => Uint8Array.from(atob(base64.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64.length / 4) * 4, "=")), (c) => c.charCodeAt(0));

async function current(): Promise<PushSubscription | null> {
  if (!pushSupported) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}
/** Whether this device is set to receive notifications, and for what. */
export async function pushStatus(): Promise<PushScope | "off"> {
  const sub = await current().catch(() => null);
  if (!sub || Notification.permission !== "granted") return "off";
  try { return localStorage.getItem("playground.push") === "all" ? "all" : "direct"; } catch { return "direct"; }
}

async function save(sub: PushSubscription, scope: PushScope) {
  const me = useHq.getState().me;
  if (!me) throw new Error("Sign in first.");
  const supabase = await getSupabase();
  const { error } = await supabase.from(TABLE).upsert({ endpoint: sub.endpoint, member_id: me.id, sub: sub.toJSON(), scope, batches: batchesOf(me), updated_at: new Date().toISOString() });
  if (error) throw new Error(/does not exist|schema cache|not find/i.test(error.message) ? "Notifications aren't set up in Supabase yet." : error.message);
  try { localStorage.setItem("playground.push", scope); } catch { /* private mode */ }
}

/** Asks permission, registers this device and saves it. Returns a message if it did not work. */
export async function enablePush(scope: PushScope): Promise<string | null> {
  if (!supabaseConfigured) return "Notifications work on the live site only.";
  if (!pushSupported) return "This browser can't show notifications. On iPhone, install the app to your Home Screen first, then open it from there.";
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "Notifications are blocked for this site. Allow them in your browser or phone settings, then try again.";
    const res = await fetch("/api/push");
    const info = (await res.json().catch(() => ({}))) as { publicKey?: string; error?: string };
    if (!res.ok || !info.publicKey) return info.error === "tables-missing" ? "Notifications aren't set up in Supabase yet." : "The notification service isn't ready yet. Try again in a minute.";
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;
    const old = await reg.pushManager.getSubscription();
    const sub = old ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(info.publicKey) }));
    await save(sub, scope);
    return null;
  } catch (err) { return err instanceof Error ? err.message : "Couldn't turn notifications on."; }
}

export async function disablePush(): Promise<void> {
  const sub = await current().catch(() => null);
  if (!sub) return;
  try { const supabase = await getSupabase(); await supabase.from(TABLE).delete().eq("endpoint", sub.endpoint); } catch { /* still unsubscribe below */ }
  await sub.unsubscribe().catch(() => undefined);
  try { localStorage.removeItem("playground.push"); } catch { /* private mode */ }
}

/** Keeps the saved device in step with my batches, each time I come in. */
export async function refreshPush() {
  const scope = await pushStatus();
  const sub = await current().catch(() => null);
  if (scope !== "off" && sub) await save(sub, scope).catch(() => undefined);
}

/** Tells the server a message was sent, so it can notify people who are not looking at the app. */
export async function notifyOthers(message: { to?: string; room?: string; text: string }) {
  if (!supabaseConfigured) return;
  try {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(message), keepalive: true });
  } catch { /* notifications are a bonus: never block chat */ }
}
