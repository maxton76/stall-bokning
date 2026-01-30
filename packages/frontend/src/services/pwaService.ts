/**
 * PWA Service - Service worker registration and push notification management
 */

// Service Worker Registration
let swRegistration: ServiceWorkerRegistration | null = null;

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredInstallPrompt: InstallPromptEvent | null = null;

/**
 * Check if the browser supports service workers
 */
export function isServiceWorkerSupported(): boolean {
  return "serviceWorker" in navigator;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return "PushManager" in window;
}

/**
 * Check if the app is running as a PWA (installed)
 */
export function isRunningAsPwa(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error - Safari specific
    window.navigator.standalone === true
  );
}

/**
 * Check if the app can be installed
 */
export function canBeInstalled(): boolean {
  return deferredInstallPrompt !== null;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.log("[PWA] Service workers not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    swRegistration = registration;

    console.log("[PWA] Service worker registered:", registration.scope);

    // Check for updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;

      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New service worker available
            dispatchEvent(
              new CustomEvent("sw-update-available", { detail: registration }),
            );
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error("[PWA] Service worker registration failed:", error);
    return null;
  }
}

/**
 * Update the service worker
 */
export async function updateServiceWorker(): Promise<void> {
  if (!swRegistration) {
    console.log("[PWA] No service worker registration found");
    return;
  }

  try {
    await swRegistration.update();
    console.log("[PWA] Service worker update check complete");
  } catch (error) {
    console.error("[PWA] Service worker update failed:", error);
  }
}

/**
 * Skip waiting and activate new service worker
 */
export function skipWaiting(): void {
  if (swRegistration?.waiting) {
    swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  }
}

/**
 * Unregister all service workers
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();

    for (const registration of registrations) {
      await registration.unregister();
    }

    swRegistration = null;
    console.log("[PWA] Service workers unregistered");
    return true;
  } catch (error) {
    console.error("[PWA] Failed to unregister service workers:", error);
    return false;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.log("[PWA] Notifications not supported");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  return await Notification.requestPermission();
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  vapidPublicKey: string,
): Promise<PushSubscriptionData | null> {
  if (!isPushSupported() || !swRegistration) {
    console.log("[PWA] Push not supported or service worker not registered");
    return null;
  }

  const permission = await requestNotificationPermission();

  if (permission !== "granted") {
    console.log("[PWA] Notification permission not granted");
    return null;
  }

  try {
    // Convert VAPID key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });

    const subscriptionJson = subscription.toJSON();

    return {
      endpoint: subscriptionJson.endpoint || "",
      keys: {
        p256dh: subscriptionJson.keys?.p256dh || "",
        auth: subscriptionJson.keys?.auth || "",
      },
    };
  } catch (error) {
    console.error("[PWA] Failed to subscribe to push:", error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported() || !swRegistration) {
    return false;
  }

  try {
    const subscription = await swRegistration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log("[PWA] Unsubscribed from push notifications");
      return true;
    }

    return false;
  } catch (error) {
    console.error("[PWA] Failed to unsubscribe from push:", error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported() || !swRegistration) {
    return null;
  }

  return await swRegistration.pushManager.getSubscription();
}

/**
 * Show a local notification (not push)
 */
export async function showNotification(
  title: string,
  options?: NotificationOptions,
): Promise<void> {
  const permission = await requestNotificationPermission();

  if (permission !== "granted") {
    console.log("[PWA] Notification permission not granted");
    return;
  }

  if (swRegistration) {
    await swRegistration.showNotification(title, {
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      ...options,
    });
  } else {
    new Notification(title, options);
  }
}

/**
 * Listen for beforeinstallprompt event
 */
export function listenForInstallPrompt(
  callback?: (event: InstallPromptEvent) => void,
): () => void {
  const handler = (event: Event) => {
    event.preventDefault();
    deferredInstallPrompt = event as InstallPromptEvent;

    if (callback) {
      callback(deferredInstallPrompt);
    }

    dispatchEvent(new CustomEvent("pwa-install-available"));
  };

  window.addEventListener("beforeinstallprompt", handler);

  return () => {
    window.removeEventListener("beforeinstallprompt", handler);
  };
}

/**
 * Prompt user to install the PWA
 */
export async function promptInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) {
    console.log("[PWA] Install prompt not available");
    return false;
  }

  try {
    await deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;

    if (choiceResult.outcome === "accepted") {
      console.log("[PWA] User accepted the install prompt");
      deferredInstallPrompt = null;
      return true;
    } else {
      console.log("[PWA] User dismissed the install prompt");
      return false;
    }
  } catch (error) {
    console.error("[PWA] Error prompting install:", error);
    return false;
  }
}

/**
 * Clear all caches
 */
export async function clearCaches(): Promise<void> {
  if (swRegistration) {
    swRegistration.active?.postMessage({ type: "CLEAR_CACHE" });
  }

  const cacheNames = await caches.keys();

  for (const cacheName of cacheNames) {
    await caches.delete(cacheName);
  }

  console.log("[PWA] All caches cleared");
}

/**
 * Pre-cache specific URLs
 */
export function preCacheUrls(urls: string[]): void {
  if (swRegistration?.active) {
    swRegistration.active.postMessage({ type: "CACHE_URLS", urls });
  }
}

/**
 * Check online status
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function listenForConnectivityChanges(
  onOnline?: () => void,
  onOffline?: () => void,
): () => void {
  const handleOnline = () => {
    console.log("[PWA] Online");
    onOnline?.();
  };

  const handleOffline = () => {
    console.log("[PWA] Offline");
    onOffline?.();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/**
 * Register for background sync
 */
export async function registerBackgroundSync(tag: string): Promise<boolean> {
  if (!swRegistration || !("sync" in swRegistration)) {
    console.log("[PWA] Background sync not supported");
    return false;
  }

  try {
    // @ts-expect-error - sync is not yet in TS types
    await swRegistration.sync.register(tag);
    console.log("[PWA] Background sync registered:", tag);
    return true;
  } catch (error) {
    console.error("[PWA] Failed to register background sync:", error);
    return false;
  }
}

/**
 * Register for periodic background sync
 */
export async function registerPeriodicSync(
  tag: string,
  minInterval: number,
): Promise<boolean> {
  if (!swRegistration) {
    return false;
  }

  // Check if periodic sync is supported
  if (!("periodicSync" in swRegistration)) {
    console.log("[PWA] Periodic sync not supported");
    return false;
  }

  try {
    const status = await navigator.permissions.query({
      // @ts-expect-error - periodic-background-sync permission
      name: "periodic-background-sync",
    });

    if (status.state !== "granted") {
      console.log("[PWA] Periodic sync permission not granted");
      return false;
    }

    // @ts-expect-error - periodicSync is not yet in TS types
    await swRegistration.periodicSync.register(tag, { minInterval });
    console.log("[PWA] Periodic sync registered:", tag);
    return true;
  } catch (error) {
    console.error("[PWA] Failed to register periodic sync:", error);
    return false;
  }
}

/**
 * Store data for offline use (IndexedDB)
 */
export async function storeOfflineData<T>(
  storeName: string,
  data: T,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("equiduty-offline", 1);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      store.add({ data, timestamp: Date.now() });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

/**
 * Get offline data from IndexedDB
 */
export async function getOfflineData<T>(storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("equiduty-offline", 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(storeName)) {
        resolve([]);
        return;
      }

      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result.map((item) => item.data));
      };

      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Initialize PWA features on import
export async function initializePwa(): Promise<void> {
  // Register service worker
  await registerServiceWorker();

  // Listen for install prompt
  listenForInstallPrompt();

  // Register periodic sync for schedule refresh (every 12 hours)
  if (swRegistration) {
    await registerPeriodicSync("refresh-schedule", 12 * 60 * 60 * 1000);
  }

  console.log("[PWA] Initialized");
}
