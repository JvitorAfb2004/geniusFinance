const BUILD_ID = "__BUILD_ID__";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Keep API, authentication, and financial responses on the network without caching.
self.addEventListener("fetch", () => {});
