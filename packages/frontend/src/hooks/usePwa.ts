import { useState, useEffect, useCallback } from "react";
import {
  isServiceWorkerSupported,
  isPushSupported,
  isRunningAsPwa,
  canBeInstalled,
  initializePwa,
  promptInstall,
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscription,
  updateServiceWorker,
  skipWaiting,
  isOnline,
  listenForConnectivityChanges,
  showNotification,
  registerBackgroundSync,
  type PushSubscriptionData,
} from "@/services/pwaService";

interface UsePwaReturn {
  // Status
  isSupported: boolean;
  isPushSupported: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  canInstall: boolean;
  hasUpdate: boolean;

  // Push notifications
  isPushEnabled: boolean;
  pushSubscription: PushSubscription | null;

  // Actions
  install: () => Promise<boolean>;
  update: () => void;
  enablePush: (vapidPublicKey: string) => Promise<PushSubscriptionData | null>;
  disablePush: () => Promise<boolean>;
  sendTestNotification: () => Promise<void>;
  syncNow: (tag: string) => Promise<boolean>;
}

export function usePwa(): UsePwaReturn {
  const [isSupported] = useState(isServiceWorkerSupported());
  const [isPushSupportedState] = useState(isPushSupported());
  const [isInstalled, setIsInstalled] = useState(isRunningAsPwa());
  const [isOnlineState, setIsOnlineState] = useState(isOnline());
  const [canInstall, setCanInstall] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [pushSubscription, setPushSubscription] =
    useState<PushSubscription | null>(null);

  // Initialize PWA on mount
  useEffect(() => {
    initializePwa();

    // Check initial push subscription
    getPushSubscription().then((subscription) => {
      setPushSubscription(subscription);
      setIsPushEnabled(!!subscription);
    });

    // Listen for install availability
    const handleInstallAvailable = () => {
      setCanInstall(canBeInstalled());
    };

    window.addEventListener("pwa-install-available", handleInstallAvailable);

    // Listen for service worker updates
    const handleUpdateAvailable = () => {
      setHasUpdate(true);
    };

    window.addEventListener("sw-update-available", handleUpdateAvailable);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // Check installed state changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };

    mediaQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener(
        "pwa-install-available",
        handleInstallAvailable,
      );
      window.removeEventListener("sw-update-available", handleUpdateAvailable);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  // Listen for connectivity changes
  useEffect(() => {
    const cleanup = listenForConnectivityChanges(
      () => setIsOnlineState(true),
      () => setIsOnlineState(false),
    );

    return cleanup;
  }, []);

  // Install PWA
  const install = useCallback(async () => {
    const installed = await promptInstall();

    if (installed) {
      setCanInstall(false);
    }

    return installed;
  }, []);

  // Update service worker
  const update = useCallback(() => {
    skipWaiting();
    setHasUpdate(false);
  }, []);

  // Enable push notifications
  const enablePush = useCallback(async (vapidPublicKey: string) => {
    const subscription = await subscribeToPush(vapidPublicKey);

    if (subscription) {
      const sub = await getPushSubscription();
      setPushSubscription(sub);
      setIsPushEnabled(true);
    }

    return subscription;
  }, []);

  // Disable push notifications
  const disablePush = useCallback(async () => {
    const success = await unsubscribeFromPush();

    if (success) {
      setPushSubscription(null);
      setIsPushEnabled(false);
    }

    return success;
  }, []);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    await showNotification("EquiDuty Test", {
      body: "Push notifications are working!",
      icon: "/icons/icon-192x192.png",
      tag: "test",
    });
  }, []);

  // Trigger background sync
  const syncNow = useCallback(async (tag: string) => {
    return await registerBackgroundSync(tag);
  }, []);

  return {
    isSupported,
    isPushSupported: isPushSupportedState,
    isInstalled,
    isOnline: isOnlineState,
    canInstall,
    hasUpdate,
    isPushEnabled,
    pushSubscription,
    install,
    update,
    enablePush,
    disablePush,
    sendTestNotification,
    syncNow,
  };
}

export default usePwa;
