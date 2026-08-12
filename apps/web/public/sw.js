self.addEventListener('push', (event) => {
  let title = 'Tablevera';
  let body = '';
  try {
    const data = event.data ? event.data.json() : {};
    title = data.title || title;
    body = data.body || data.message || '';
  } catch {
    body = event.data ? event.data.text() : '';
  }
  event.waitUntil(self.registration.showNotification(title, { body }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/reservations'));
});
