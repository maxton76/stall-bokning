// Service Worker for Stallbokning PWA
const CACHE_VERSION = "v2";
const STATIC_CACHE = `stallbokning-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `stallbokning-dynamic-${CACHE_VERSION}`;
const API_CACHE = `stallbokning-api-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json", "/offline.html"];

// API routes that can be cached for offline use
const CACHEABLE_API_ROUTES = [
  "/api/v1/horses",
  "/api/v1/stables",
  "/api/v1/feeding/times",
  "/api/v1/feed-types",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return (
                name.startsWith("stallbokning-") &&
                name !== STATIC_CACHE &&
                name !== DYNAMIC_CACHE &&
                name !== API_CACHE
              );
            })
            .map((name) => {
              console.log("[SW] Deleting old cache:", name);
              return caches.delete(name);
            }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default: network first, fallback to cache
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// Check if URL is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = [
    ".js",
    ".css",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".woff",
    ".woff2",
    ".ttf",
  ];
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

// Cache-first strategy (for static assets)
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Return cached response and update cache in background
    updateCache(request, cacheName);
    return cachedResponse;
  }

  return fetchAndCache(request, cacheName);
}

// Network-first strategy (for dynamic content)
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Handle API requests with stale-while-revalidate
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_ROUTES.some((route) =>
    url.pathname.includes(route),
  );

  if (!isCacheable) {
    // Non-cacheable API: network only
    return fetch(request);
  }

  // Cacheable API: stale-while-revalidate
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const responseClone = response.clone();
        caches.open(API_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });
      }
      return response;
    })
    .catch((error) => {
      console.log("[SW] API fetch failed:", error);
      return (
        cachedResponse ||
        new Response(
          JSON.stringify({
            error: "Offline",
            message: "No cached data available",
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        )
      );
    });

  // Return cached response immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Handle navigation requests (SPA routing)
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Try to return cached index.html for SPA navigation
    const cachedIndex = await caches.match("/index.html");

    if (cachedIndex) {
      return cachedIndex;
    }

    // Fallback to offline page
    const offlinePage = await caches.match("/offline.html");

    if (offlinePage) {
      return offlinePage;
    }

    return new Response("Offline", { status: 503 });
  }
}

// Fetch and cache a request
async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log("[SW] Fetch failed:", error);
    throw error;
  }
}

// Update cache in background
async function updateCache(request, cacheName) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response);
    }
  } catch (error) {
    // Silently fail for background updates
  }
}

// Push notification handling
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  let data = {
    title: "Stallbokning",
    body: "You have a new notification",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "default",
    data: {},
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.notification.tag);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }

        // Open a new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});

// Handle notification close
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed:", event.notification.tag);
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag);

  if (event.tag === "sync-activities") {
    event.waitUntil(syncActivities());
  } else if (event.tag === "sync-bookings") {
    event.waitUntil(syncBookings());
  }
});

// Sync pending activities
async function syncActivities() {
  try {
    const db = await openIndexedDB();
    const pendingActivities = await getAllPending(db, "pending-activities");

    for (const activity of pendingActivities) {
      try {
        const response = await fetch("/api/v1/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activity.data),
        });

        if (response.ok) {
          await deletePending(db, "pending-activities", activity.id);
        }
      } catch (error) {
        console.log("[SW] Failed to sync activity:", error);
      }
    }
  } catch (error) {
    console.log("[SW] Sync activities failed:", error);
  }
}

// Sync pending bookings
async function syncBookings() {
  try {
    const db = await openIndexedDB();
    const pendingBookings = await getAllPending(db, "pending-bookings");

    for (const booking of pendingBookings) {
      try {
        const response = await fetch("/api/v1/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(booking.data),
        });

        if (response.ok) {
          await deletePending(db, "pending-bookings", booking.id);
        }
      } catch (error) {
        console.log("[SW] Failed to sync booking:", error);
      }
    }
  } catch (error) {
    console.log("[SW] Sync bookings failed:", error);
  }
}

// IndexedDB helpers for offline storage
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("stallbokning-offline", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("pending-activities")) {
        db.createObjectStore("pending-activities", {
          keyPath: "id",
          autoIncrement: true,
        });
      }

      if (!db.objectStoreNames.contains("pending-bookings")) {
        db.createObjectStore("pending-bookings", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
  });
}

function getAllPending(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deletePending(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Periodic background sync for keeping data fresh
self.addEventListener("periodicsync", (event) => {
  console.log("[SW] Periodic sync:", event.tag);

  if (event.tag === "refresh-schedule") {
    event.waitUntil(refreshScheduleData());
  }
});

async function refreshScheduleData() {
  try {
    const response = await fetch("/api/v1/schedule/upcoming");

    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put("/api/v1/schedule/upcoming", response);
    }
  } catch (error) {
    console.log("[SW] Failed to refresh schedule:", error);
  }
}

// Message handling from main thread
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data.type === "CACHE_URLS") {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => cache.addAll(event.data.urls)),
    );
  } else if (event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches
        .keys()
        .then((names) => Promise.all(names.map((name) => caches.delete(name)))),
    );
  }
});
