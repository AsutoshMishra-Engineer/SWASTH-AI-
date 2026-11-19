// Firebase Cloud Messaging Service Worker (Web Push Notifications)
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId
// If customized via firebase config, it hooks seamlessly into Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSySwasthAiPublicWebKey",
  authDomain: "swasth-ai-lite.firebaseapp.com",
  projectId: "swasth-ai-lite",
  storageBucket: "swasth-ai-lite.appspot.com",
  messagingSenderId: "109876543210",
  appId: "1:109876543210:web:abcdef123456"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'Swasth AI Health Alert';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'New public health advisory available.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'swasth-health-alert',
      data: {
        url: payload.data?.url || '/'
      }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.warn('Firebase Messaging SW initial notice:', e);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('swasth-ai') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});
