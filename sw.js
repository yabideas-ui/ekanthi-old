// Old address service worker: no caching any more (so the forwarding page always loads), but old notifications still show.
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })
    .then(function () { return self.clients.claim(); })
    .then(function () { return self.clients.matchAll({ type: "window" }); })
    .then(function (cl) { cl.forEach(function (c) { try { c.navigate(c.url); } catch (x) {} }); }));
});
self.addEventListener("push", function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "Ekanthi", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Ekanthi", { body: d.body || "", icon: "https://www.ekanthi.in/icon-192.png", tag: d.tag || "ekanthi", data: { url: d.url || "/" } }));
});
self.addEventListener("notificationclick", function (e) { e.notification.close(); e.waitUntil(self.clients.openWindow("https://www.ekanthi.in" + ((e.notification.data && e.notification.data.url) || "/"))); });
