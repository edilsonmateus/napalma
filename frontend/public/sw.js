self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "77Gira",
      body: event.data ? event.data.text() : "Tem samba perto de você."
    };
  }

  const title = payload.title || "77Gira";
  const options = {
    body: payload.body || "Tem samba bom acontecendo agora.",
    icon: payload.icon || "/assets/brand/icon-192.png",
    badge: payload.badge || "/assets/brand/icon-192.png",
    tag: payload.tag || "77gira-to-na-pista",
    renotify: true,
    data: {
      url: payload.url || "/explore"
    },
    actions: [
      {
        action: "open",
        title: "Partiu Agora!"
      }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl = event.notification?.data?.url || "/explore";
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("navigate" in client && "focus" in client) {
          return client.navigate(targetUrl).then(() => client.focus());
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
