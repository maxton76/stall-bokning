// Firebase Messaging Service Worker for background push notifications
// This service worker handles FCM messages when the app is not in the foreground.
// Version must match the firebase SDK version in package.json.
importScripts(
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js",
);

// Firebase config is injected via postMessage from the main app thread.
// Fallback to empty strings - the SW will not function until config is received,
// but the onBackgroundMessage handler will still be registered.
let firebaseInitialized = false;

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    if (!firebaseInitialized) {
      firebase.initializeApp(event.data.config);
      firebaseInitialized = true;

      // Re-initialize messaging after config is set
      firebase.messaging();
      console.log(
        "[firebase-messaging-sw] Firebase initialized with config from main thread",
      );
    }
  }
});

// Try initializing with hardcoded project config as fallback
// These are public Firebase config values (safe to include in client-side code)
try {
  if (!firebase.apps.length) {
    // Config will be sent via postMessage, but we need a valid app for onBackgroundMessage
    // This initialization may fail if no config is available, which is fine -
    // it will be re-initialized when the main thread sends FIREBASE_CONFIG
    firebase.initializeApp({
      apiKey: "placeholder",
      projectId: "placeholder",
      messagingSenderId: "placeholder",
      appId: "placeholder",
    });
  }
} catch {
  // Will be initialized when config is received via postMessage
}

let messaging;
try {
  messaging = firebase.messaging();
} catch {
  // messaging() will work after proper initialization
}

// Handle background messages (when app is not in foreground)
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log(
      "[firebase-messaging-sw] Background message received:",
      payload,
    );

    const data = payload.data || {};
    const notification = payload.notification || {};

    const title = data.title || notification.title || "EquiDuty";
    const body = data.body || notification.body || "";
    const actionUrl = data.actionUrl || "/";

    const options = {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      tag: data.notificationId || "equiduty-notification",
      data: { actionUrl },
    };

    self.registration.showNotification(title, options);
  });
}

// Handle notification click - open or focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const actionUrl = event.notification.data?.actionUrl || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing window if available
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.postMessage({ type: "NOTIFICATION_CLICK", actionUrl });
            return;
          }
        }
        // Open new window if no existing window found
        return clients.openWindow(actionUrl);
      }),
  );
});
