self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (error) {
    data = {
      title: event.data.text(),
      body: "",
    };
  }

  const title = data.title || "FinanceAgent";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-96x96.png",
    tag: data.tag || "notification",
    requireInteraction: data.requireInteraction !== false,
    actions: data.actions || [
      {
        action: "view",
        title: "Ver",
      },
      {
        action: "dismiss",
        title: "Dispensar",
      },
    ],
    data: {
      url: data.url || "/",
      ...data.data,
    },
  };
  if (data.vibrate) {
    options.vibrate = data.vibrate;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === "dismiss") {
    return;
  }

  const urlToOpen = action === "view" && data.url ? data.url : "/";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("Notification closed:", event.notification.tag);
});

// REMOVA O OUVINTE "message" QUE ADICIONAMOS ANTES
/*
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "show-notification") {
    const { title, options } = event.data;
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});
*/

self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(clients.claim());
});
