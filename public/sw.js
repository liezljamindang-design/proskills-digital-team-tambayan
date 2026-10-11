// Lets the Tambayan be installed as an app. It deliberately keeps no copy of the site,
// so everyone always gets the newest version straight from the server.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

// Notifications for new messages, shown even when the app is closed.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* not ours */ }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Already looking at the app: the message is on screen, so stay quiet.
    if (windows.some((w) => w.visibilityState === "visible" && w.focused)) return;
    await self.registration.showNotification(String(data.title || "Pro Skills Digital Lobby").slice(0, 80), {
      body: String(data.body || "New message").slice(0, 160), tag: String(data.tag || "tambayan"), renotify: true,
      icon: "/icon-192.png", badge: "/icon-192.png",
    });
  })());
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (windows.length) return windows[0].focus();
    return self.clients.openWindow("/");
  })());
});
