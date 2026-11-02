import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Promotion, PromotionCategory } from "@/lib/promotions";

/** Read-only offers used by the catalog and product pages. The cart remains
 * authoritative for minimum-purchase, fixed and quantity-based benefits. */
export function useStorePromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<PromotionCategory[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [offers, cats] = await Promise.all([
          supabase.from("promotions").select("*").eq("active", true).eq("visible", true).eq("kind", "automatic_discount"),
          supabase.from("categories").select("id,parent_id"),
        ]);
        if (!mounted) return;
        if (!offers.error) setPromotions((offers.data ?? []) as Promotion[]);
        if (!cats.error) setCategories((cats.data ?? []) as PromotionCategory[]);
      } catch {
        // A temporary error must not block the store. No unverified discount is advertised.
      }
    }
    void load();
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    return () => { mounted = false; window.removeEventListener("focus", onFocus); };
  }, []);

  return { promotions, categories };
}
