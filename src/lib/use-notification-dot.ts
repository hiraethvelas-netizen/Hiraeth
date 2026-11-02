import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Show a small indicator whenever this signed-in account has any notification.
 * No read/unread state, count, badge persistence, or cross-account caching.
 */
export function useNotificationDot(): boolean {
  const [hasNotifications, setHasNotifications] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const currentRequest = ++requestId.current;
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (!mounted || currentRequest !== requestId.current) return;
        if (authError || !auth.user) {
          setHasNotifications(false);
          return;
        }
        // RLS returns only notifications visible to the signed-in account.
        const { data, error } = await (supabase as any)
          .from("app_notifications").select("id").limit(1);
        if (!mounted || currentRequest !== requestId.current) return;
        if (!error) setHasNotifications(Array.isArray(data) && data.length > 0);
      } catch {
        // A temporary network error does not imply that past notifications vanished.
      }
    }

    void check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      requestId.current++;
      setHasNotifications(false);
      if (session?.user && mounted) {
        // Defer the database request until the auth event has completed.
        window.setTimeout(() => { if (mounted) void check(); }, 0);
      }
    });
    const onFocus = () => { void check(); };
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => {
      if (!document.hidden) void check();
    }, 45000);

    return () => {
      mounted = false;
      requestId.current++;
      subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, []);

  return hasNotifications;
}
