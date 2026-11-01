import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useLibraryCategories() {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase
        .from("categories")
        .select("name")
        .eq("visible", true)
        .order("name");
      if (active && !error) setNames((data ?? []).map((category) => category.name));
    }
    void load();
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
    };
  }, []);
  return names;
}
