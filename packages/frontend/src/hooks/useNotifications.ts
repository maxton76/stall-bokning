import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/authFetch";
import type {
  Notification,
  NotificationPreferences,
} from "@stall-bokning/shared";

interface UseNotificationsOptions {
  limit?: number;
  stableId?: string;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearRead: () => Promise<void>;
  refresh: () => void;
}

/**
 * Hook for managing real-time notifications
 */
export function useNotifications(
  options: UseNotificationsOptions = {},
): UseNotificationsReturn {
  const { user } = useAuth();
  const { limit: limitCount = 50, stableId } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Set up real-time listener
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query
      let q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(limitCount),
      );

      if (stableId) {
        q = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid),
          where("stableId", "==", stableId),
          orderBy("createdAt", "desc"),
          limit(limitCount),
        );
      }

      // Subscribe to changes
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notifs: Notification[] = [];
          let unread = 0;

          snapshot.forEach((doc) => {
            const data = doc.data();
            const notification = {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || new Date(),
              updatedAt: data.updatedAt?.toDate?.() || new Date(),
              readAt: data.readAt?.toDate?.(),
              scheduledFor: data.scheduledFor?.toDate?.(),
              expiresAt: data.expiresAt?.toDate?.(),
            } as Notification;

            notifs.push(notification);
            if (!notification.read) {
              unread++;
            }
          });

          setNotifications(notifs);
          setUnreadCount(unread);
          setLoading(false);
        },
        (err) => {
          console.error("Notification listener error:", err);
          setError("Failed to load notifications");
          setLoading(false);
        },
      );

      unsubscribeRef.current = unsubscribe;

      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error("Failed to set up notification listener:", err);
      setError("Failed to load notifications");
      setLoading(false);
    }
  }, [user?.uid, limitCount, stableId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await authFetch(`/api/v1/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      // Real-time listener will update the state
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await authFetch("/api/v1/notifications/read-all", {
        method: "PATCH",
      });
      // Real-time listener will update the state
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      throw err;
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await authFetch(`/api/v1/notifications/${notificationId}`, {
        method: "DELETE",
      });
      // Real-time listener will update the state
    } catch (err) {
      console.error("Failed to delete notification:", err);
      throw err;
    }
  }, []);

  const clearRead = useCallback(async () => {
    try {
      await authFetch("/api/v1/notifications/clear-read", {
        method: "DELETE",
      });
      // Real-time listener will update the state
    } catch (err) {
      console.error("Failed to clear read notifications:", err);
      throw err;
    }
  }, []);

  const refresh = useCallback(() => {
    // Force re-subscribe by updating state
    // The useEffect will handle the new subscription
    setLoading(true);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearRead,
    refresh,
  };
}

/**
 * Hook for managing notification preferences
 */
export function useNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        const response = await authFetch("/api/v1/notifications/preferences");
        const data = await response.json();
        setPreferences(data.preferences);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load notification preferences:", err);
        setError("Failed to load preferences");
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user?.uid]);

  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!user?.uid) return;

      setSaving(true);
      try {
        const response = await authFetch("/api/v1/notifications/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        const data = await response.json();
        setPreferences(data.preferences);
      } catch (err) {
        console.error("Failed to update notification preferences:", err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user?.uid],
  );

  const registerFCMToken = useCallback(
    async (
      token: string,
      deviceId: string,
      platform: "ios" | "android" | "web",
    ) => {
      if (!user?.uid) return;

      try {
        await authFetch("/api/v1/notifications/preferences/fcm-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, deviceId, platform }),
        });
      } catch (err) {
        console.error("Failed to register FCM token:", err);
        throw err;
      }
    },
    [user?.uid],
  );

  const removeFCMToken = useCallback(
    async (deviceId: string) => {
      if (!user?.uid) return;

      try {
        await authFetch(
          `/api/v1/notifications/preferences/fcm-token/${deviceId}`,
          {
            method: "DELETE",
          },
        );
      } catch (err) {
        console.error("Failed to remove FCM token:", err);
        throw err;
      }
    },
    [user?.uid],
  );

  return {
    preferences,
    loading,
    error,
    saving,
    updatePreferences,
    registerFCMToken,
    removeFCMToken,
  };
}
