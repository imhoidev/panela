const CACHE = "panela-v1";

const PRECACHE = [
  "/",
  "/icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    }),
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
