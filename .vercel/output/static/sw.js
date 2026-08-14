const CACHE = "panela-v2";

const PRECACHE = [
  "/icon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Do not intercept API requests or static build assets (let browser cache/network handle them)
  if (url.pathname.includes("/api/") || url.pathname.includes("/assets/")) return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body || "",
      icon: data.icon || "/icon.png",
      badge: data.badge || "/icon.png",
      data: data.data || {},
      tag: data.tag || "default",
      requireInteraction: data.requireInteraction !== false,
      actions: data.actions || [],
      vibrate: data.vibrate || [100, 50, 100],
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  } catch (e) {
    console.error("push error", e);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  const action = event.action;

  if (action === "mark_read") {
    const tag = event.notification.tag;
    if (tag) {
      const clients = self.clients.matchAll({ type: "window" });
      clients.then((list) => {
        list.forEach((client) => client.postMessage({ type: "mark_read", tag }));
      });
    }
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
