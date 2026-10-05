// Service worker de KAIRAS OS — solo gestiona notificaciones push.
// No cachea nada: esta app no es offline-first, el único motivo para
// registrar un SW es que Web Push lo exige.

self.addEventListener("push", (event) => {
  let data = { title: "KAIRAS", body: "" };
  try {
    data = event.data ? event.data.json() : data;
  } catch {
    data = { title: "KAIRAS", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "KAIRAS", {
      body: data.body || "",
      icon: "/brand/kairas-favicon-512.png",
      badge: "/brand/kairas-favicon-512.png",
      tag: data.tag,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
