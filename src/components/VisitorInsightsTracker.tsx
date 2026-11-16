import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { visitFromPath, visitSessionKey } from "@/lib/visitor-insights";

/**
 * One aggregated page-entry per tab/day/channel.
 * Anonymous visitors never get a permanent visitor identifier, IP record
 * or analytics cookie. Authenticated customers can see the disclosure in
 * the privacy policy; only admins can read the account activity summary.
 */
export function VisitorInsightsTracker() {
  const path = useRouterState({ select: state => state.location.pathname });

  useEffect(() => {
    const visit = visitFromPath(path);
    if (!visit) return;
    let active = true;

    async function track() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        const account = data.session?.user.id ? `user-${data.session.user.id}` : "visitor";
        const day = new Date().toISOString().slice(0, 10);
        const key = visitSessionKey(visit!, account, day);
        if (window.sessionStorage.getItem(key) === "sent") return;
        // Keep only a temporary, local per-tab de-duplication key. Nothing
        // about the anonymous visitor is transmitted with the count.
        const { error } = await (supabase as any).rpc("hiraeth_record_visit", {
          p_channel: visit!.channel,
          p_portal_slug: visit!.portalSlug,
        });
        if (!error && active) window.sessionStorage.setItem(key, "sent");
      } catch {
        // Analytics must never block the storefront or the NFC experience.
      }
    }
    void track();
    return () => { active = false; };
  }, [path]);

  return null;
}
