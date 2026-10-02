self.addEventListener('push', (event) => {
  let title = 'Tablevera';
  let body = '';
  let data = {};
  let categoryId;
  try {
    const payload = event.data ? event.data.json() : {};
    title = payload.title || title;
    body = payload.body || payload.message || '';
    data = payload.data || {};
    categoryId = payload.categoryId;
  } catch {
    body = event.data ? event.data.text() : '';
  }

  const options = {
    body,
    data: { ...data, categoryId },
  };

  // Interactive Yes/No for closer reservation reminders
  if (categoryId === 'reservation_reminder_late') {
    options.actions = [
      { action: 'RUNNING_LATE_YES', title: 'Yes' },
      { action: 'RUNNING_LATE_NO', title: 'No' },
    ];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const reservationId = data.reservationId;
  const action = event.action;

  let path = '/reservations';
  if (action === 'RUNNING_LATE_YES' && reservationId) {
    path = `/reservations/${reservationId}?runningLate=1`;
  } else if (action === 'RUNNING_LATE_NO') {
    // Guest is on time — no navigation needed
    return;
  } else if (reservationId) {
    path = `/reservations/${reservationId}`;
  }

  event.waitUntil(self.clients.openWindow(path));
});
