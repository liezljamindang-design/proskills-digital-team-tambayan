// Lets the Tambayan be installed as an app. It deliberately keeps no copy of the site,
// so everyone always gets the newest version straight from the server.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
