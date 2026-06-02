// ============================================================
// sw.js — service worker for the member dashboard (push only).
//
// Served from /dashboard/ so its scope is automatically "/dashboard/".
// IMPORTANT: this file is plain JS (NOT type="text/babel"). The browser
// fetches and runs a service worker directly — it is never Babel-transformed.
// Do not add JSX or in-browser-only globals here.
//
// We intentionally do NOT add a fetch/offline cache: this is a push-only
// worker, so we never risk serving a stale CDN React/Babel bundle.
// ============================================================

// Install: activate the new worker immediately instead of waiting for all
// old tabs to close.
self.addEventListener("install", function () {
  self.skipWaiting();
});

// Activate: take control of already-open dashboard tabs.
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

// Push: the backend sends a JSON body { title, body, url, tag, icon }.
self.addEventListener("push", function (event) {
  var payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "Link in HK", body: event.data ? event.data.text() : "" };
  }

  var title = payload.title || "Link in HK";
  var options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || "linkinhk",
    renotify: true,
    data: { url: payload.url || "/dashboard/#match" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click: focus an already-open dashboard tab (and tell it which
// tab to route to) or open a new one.
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var targetUrl =
    (event.notification.data && event.notification.data.url) || "/dashboard/#match";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.indexOf("/dashboard/") !== -1) {
            // Can't change client.url directly; the page applies the hash.
            client.postMessage({ type: "NOTIFICATION_NAVIGATE", url: targetUrl });
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      })
  );
});
