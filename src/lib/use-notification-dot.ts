import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getNotificationsViewedAt,
  hasNotificationsSince,
  NOTIFICATIONS_VIEWED_EVENT,
} from "@/lib/notifications";

/**
 * A small gold dot appears only if a notification was created after the user
 * last opened Sinais da Chama. No per-message read/unread status is stored.
 */
export function useNotificationDot(): boolean {
  const [hasNotifications, setHasNotifications] = useState(false);
  const requestId = useRef(0);
  const activeUser = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let authTimer: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      const request = ++requestId.current;
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (!mounted || request !== requestId.current) return;
        const userId = authError ? null : auth.user?.id ?? null;
        activeUser.current = userId;
        if (!userId) {
          setHasNotifications(false);
          return;
        }

        // RLS allows only this customer's notifications and global notices.
        const { data, error } = await (supabase as any)
          .from("app_notifications")
          .select("id,created_at")
          .order("created_at", { ascending: false })
          .limit(1);
        if (!mounted || request !== requestId.current) return;
        if (!error) setHasNotifications(
          hasNotificationsSince(data, getNotificationsViewedAt(userId)),
        );
      } catch {
        // Keep last known state if the app is temporarily offline.
      }
    }

    // Immediately clear this account's indicator when Sinais da Chama opens.
    function onViewed(event: Event) {
      const { userId } = (event as CustomEvent<{ userId: string }>).detail ?? {};
      if (!userId || userId !== activeUser.current) return;
      requestId.current++; // Supersede checks started before opening.
      setHasNotifications(false);
    }

    const onFocus = () => { void check(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key?.startsWith("hiraeth:notifications-last-opened:v1:")) {
        void check();
      }
    };

    window.addEventListener(NOTIFICATIONS_VIEWED_EVENT, onViewed);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    void check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      requestId.current++;
      activeUser.current = session?.user?.id ?? null;
      setHasNotifications(false);
      if (authTimer !== undefined) window.clearTimeout(authTimer);
      if (session?.user && mounted) {
        authTimer = window.setTimeout(() => { if (mounted) void check(); }, 0);
      }
    });

    const interval = window.setInterval(() => {
      if (!document.hidden) void check();
    }, 45000);

    return () => {
      mounted = false;
      requestId.current++;
      if (authTimer !== undefined) window.clearTimeout(authTimer);
      subscription.unsubscribe();
      window.removeEventListener(NOTIFICATIONS_VIEWED_EVENT, onViewed);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
  }, []);

  return hasNotifications;
}
