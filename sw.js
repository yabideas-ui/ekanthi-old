// Ekanthi service worker — notifications + instant start.
// The app page is served from the phone's cache at once (fast open), and the latest version is fetched in the
// background; when it changed, the open page is told so it can offer "New version ready — refresh".
var SHELL = "ekanthi-shell-v2";
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== SHELL; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request; if (r.method !== "GET") return;
  var u = new URL(r.url); if (u.origin !== self.location.origin) return;
  if (/\.apk$/i.test(u.pathname)) return;   // the Android app download must never be swapped for the page
  var isPage = u.pathname === "/" || u.pathname === "/index.html" || (r.mode === "navigate" && !/\.[a-z0-9]+$/i.test(u.pathname));
  if (isPage) {
    e.respondWith(caches.open(SHELL).then(function (c) {
      return c.match("/index.html").then(function (cached) {
        var oldCopy = cached ? cached.clone() : null;   // clone now — the page will read the cached body
        var net = fetch("/index.html", { cache: "no-store" }).then(function (res) {
          if (!res || !res.ok) return res;
          var toCache = res.clone(), toRead = res.clone();
          return Promise.all([oldCopy ? oldCopy.text() : Promise.resolve(null), toRead.text()]).then(function (t) {
            return c.put("/index.html", toCache).then(function () {
              if (t[0] !== null && t[0] !== t[1]) self.clients.matchAll({ type: "window" }).then(function (cl) { cl.forEach(function (x) { x.postMessage({ type: "ekanthi-updated" }); }); });
              return res;
            });
          });
        }).catch(function () { return cached; });
        if (cached) { e.waitUntil(net.catch(function () {})); return cached; }
        return net;
      });
    }));
    return;
  }
  if (/\.(png|webmanifest)$/.test(u.pathname)) {
    e.respondWith(caches.open(SHELL).then(function (c) { return c.match(r).then(function (m) {
      var f = fetch(r).then(function (res) { if (res && res.ok) c.put(r, res.clone()); return res; });
      return m || f;
    }); }));
  }
});
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "Ekanthi", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Ekanthi", {
    body: d.body || "", icon: "/icon-192.png", badge: "/badge-96.png", tag: d.tag || "ekanthi", renotify: true,
    data: { url: d.url || "/" }, vibrate: [120, 60, 120]
  }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if ("focus" in list[i]) return list[i].focus(); }
    return self.clients.openWindow(url);
  }));
});
