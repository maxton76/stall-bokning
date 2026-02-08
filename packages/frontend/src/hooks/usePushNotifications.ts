import { useState, useEffect, useCallback, useRef } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationPreferences } from "@/hooks/useNotifications";
import { toast } from "@/hooks/use-toast";

/**
 * Generate or retrieve a stable device ID for this browser.
 * Persisted in localStorage so the same browser always uses the same ID.
 */
function getDeviceId(): string {
  const key = "equiduty_device_id";
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
}

/**
 * Send Firebase config to the messaging service worker so it can initialize.
 */
async function sendConfigToServiceWorker(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  };

  // Wait for the service worker to be active before posting
  const sw =
    registration.active || registration.waiting || registration.installing;
  if (sw) {
    sw.postMessage({ type: "FIREBASE_CONFIG", config });
  }
}

export interface UsePushNotificationsReturn {
  /** Current browser notification permission state, or "unsupported" */
  permissionState: NotificationPermission | "unsupported";
  /** Whether an FCM token is registered with the backend for this device */
  isRegistered: boolean;
  /** Whether a registration or permission request is in progress */
  isLoading: boolean;
  /** Request notification permission and register FCM token */
  requestPermission: () => Promise<void>;
  /** Unregister this device's FCM token from the backend */
  unregister: () => Promise<void>;
}

/**
 * Hook for managing web push notifications via Firebase Cloud Messaging.
 *
 * Handles:
 * - Requesting browser notification permission
 * - Registering the FCM token with the backend API
 * - Setting up foreground message handling (shows toast notifications)
 * - Auto-registering if permission was previously granted
 * - Graceful degradation if messaging is not supported
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();
  const { registerFCMToken, removeFCMToken } = useNotificationPreferences();
  const [permissionState, setPermissionState] = useState<
    NotificationPermission | "unsupported"
  >(
    typeof Notification !== "undefined"
      ? Notification.permission
      : "unsupported",
  );
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const registrationAttemptedRef = useRef(false);

  // Set up foreground message handler when permission is granted
  useEffect(() => {
    if (!user?.uid || permissionState !== "granted") return;

    let cancelled = false;

    const setupForegroundHandler = async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging || cancelled) return;

      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("[FCM] Foreground message:", payload);

        const data = payload.data || {};
        const notification = payload.notification;
        const title = data.title || notification?.title || "EquiDuty";
        const body = data.body || notification?.body || "";

        // Show in-app toast for foreground notifications
        toast({
          title,
          description: body,
        });
      });

      unsubscribeRef.current = unsubscribe;
    };

    setupForegroundHandler();

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [user?.uid, permissionState]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      setPermissionState("unsupported");
      return;
    }

    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission !== "granted") return;

      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        console.warn("[FCM] Messaging not supported in this browser");
        return;
      }

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn(
          "[FCM] VITE_FIREBASE_VAPID_KEY not set, cannot register for push notifications",
        );
        return;
      }

      // Register the firebase-messaging service worker for background messages
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
      );

      // Send Firebase config to the service worker
      await sendConfigToServiceWorker(registration);

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        const deviceId = getDeviceId();
        await registerFCMToken(token, deviceId, "web");
        setIsRegistered(true);
        console.log("[FCM] Web push token registered successfully");
      }
    } catch (err) {
      console.error("[FCM] Failed to set up push notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [registerFCMToken]);

  const unregister = useCallback(async () => {
    setIsLoading(true);
    try {
      const deviceId = getDeviceId();
      await removeFCMToken(deviceId);
      setIsRegistered(false);
      console.log("[FCM] Web push token unregistered");
    } catch (err) {
      console.error("[FCM] Failed to unregister push notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [removeFCMToken]);

  // Auto-register if permission was previously granted and user is logged in
  useEffect(() => {
    if (
      user?.uid &&
      permissionState === "granted" &&
      !isRegistered &&
      !registrationAttemptedRef.current
    ) {
      registrationAttemptedRef.current = true;
      requestPermission();
    }
  }, [user?.uid, permissionState, isRegistered, requestPermission]);

  // Reset registration attempt flag when user changes
  useEffect(() => {
    registrationAttemptedRef.current = false;
    setIsRegistered(false);
  }, [user?.uid]);

  return {
    permissionState,
    isRegistered,
    isLoading,
    requestPermission,
    unregister,
  };
}
