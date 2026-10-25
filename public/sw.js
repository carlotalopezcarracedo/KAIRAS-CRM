// Service worker de KAIRAS OS — solo gestiona notificaciones push.
// No cachea nada: esta app no es offline-first, el único motivo para
// registrar un SW es que Web Push lo exige.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
      badge: "/favicon-32.png",
      tag: data.tag,
      // Con `tag`, Android/Chrome sustituye en silencio el aviso anterior;
      // renotify hace que vuelva a sonar/vibrar.
      renotify: Boolean(data.tag),
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      // Reutiliza la ventana abierta (PWA) y la lleva a la ruta del aviso.
      for (const client of clients) {
        if (new URL(client.url).origin === target.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target.href);
            } catch {
              /* navegación no permitida: basta con el foco */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target.href);
    }),
  );
});

// El navegador puede rotar la suscripción; se vuelve a registrar sola.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const old = event.oldSubscription;
      const key = old?.options?.applicationServerKey;
      if (!key) return;
      const sub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
        credentials: "include",
      });
    })(),
  );
});
