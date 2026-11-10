import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export const COLLECTION_VISIBILITY_KEY = "store-collection-visibility";
const CHANGED_EVENT = "hiraeth:collection-visibility-updated";

export type CollectionVisibility = Record<string, unknown> & {
  showSection: boolean;
  visibleCategoryIds: string[] | null;
};

export function collectionVisibilityFrom(value: unknown): CollectionVisibility {
  const saved =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const ids = saved["visibleCategoryIds"];
  return {
    ...saved,
    showSection: saved["showSection"] !== false,
    visibleCategoryIds:
      ids == null
        ? null
        : Array.isArray(ids)
          ? [
              ...new Set(
                ids.filter((id): id is string => typeof id === "string" && Boolean(id.trim())),
              ),
            ]
          : [],
  };
}

/** Only controls the circles, independently from category/product availability. */
export function useCollectionVisibility() {
  const [settings, setSettings] = useState<CollectionVisibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const current = useRef<CollectionVisibility | null>(null);
  const mounted = useRef(false);
  const request = useRef(0);
  const saving = useRef(false);

  const refresh = useCallback(async () => {
    if (saving.current) return;
    const version = ++request.current;
    try {
      const result = await supabase
        .from("site_content")
        .select("value")
        .eq("key", COLLECTION_VISIBILITY_KEY)
        .maybeSingle();
      if (result.error) throw result.error;
      if (!mounted.current || version !== request.current) return;
      const next = collectionVisibilityFrom(result.data?.value);
      current.current = next;
      setSettings(next);
      setError(false);
    } catch {
      if (!mounted.current || version !== request.current) return;
      current.current = null;
      setSettings(null);
      setError(true);
    } finally {
      if (mounted.current && version === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const listener = () => {
      void refresh();
    };
    window.addEventListener("focus", listener);
    window.addEventListener(CHANGED_EVENT, listener);
    const timer = window.setInterval(listener, 15000);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", listener);
      window.removeEventListener(CHANGED_EVENT, listener);
    };
  }, [refresh]);

  const save = useCallback(async (next: CollectionVisibility) => {
    if (!current.current || saving.current)
      throw new Error("Aguarde o carregamento das opções das bolinhas.");
    const value = collectionVisibilityFrom({ ...current.current, ...next });
    saving.current = true;
    ++request.current;
    try {
      const { error: saveError } = await supabase.from("site_content").upsert(
        {
          key: COLLECTION_VISIBILITY_KEY,
          value: value as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
      if (saveError) throw saveError;
      if (mounted.current) {
        current.current = value;
        setSettings(value);
        setError(false);
        setLoading(false);
      }
    } finally {
      saving.current = false;
    }
    window.dispatchEvent(new Event(CHANGED_EVENT));
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    setError(false);
    void refresh();
  }, [refresh]);

  return { settings, loading, error, save, retry };
}
