importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA7H-2t54t3yGF_UQphaI2JuQ6r5y0ld0g",
  authDomain: "dokdokhae-f84c7.firebaseapp.com",
  projectId: "dokdokhae-f84c7",
  storageBucket: "dokdokhae-f84c7.firebasestorage.app",
  messagingSenderId: "437878503798",
  appId: "1:437878503798:web:e2a88fff6ea5e3f187e257",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { notifId, url, title, body } = payload.data || {};
  if (title) {
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      tag: notifId,
      data: { url },
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.navigate(url).catch(() => client).then((c) => c.focus());
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
