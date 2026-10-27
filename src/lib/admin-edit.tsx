import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

// Admin inline-edit state: admin role is checked against the database (has_role);
// writes are enforced by RLS, this only controls what the UI shows.
type State = { isAdmin: boolean; editMode: boolean };
let state: State = { isAdmin: false, editMode: false };
const listeners = new Set<() => void>();
let started = false;

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

async function refreshRole() {
  // Fail closed while checking; never leave the edit control visible during auth changes.
  set({ isAdmin: false, editMode: false });
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      window.localStorage.setItem("hiraeth-edit-mode", "off");
      return;
    }
    const { data: ok, error: roleError } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    const isAdmin = !roleError && ok === true;
    if (!isAdmin) window.localStorage.setItem("hiraeth-edit-mode", "off");
    set({ isAdmin, editMode: isAdmin && window.localStorage.getItem("hiraeth-edit-mode") === "on" });
  } catch {
    window.localStorage.setItem("hiraeth-edit-mode", "off");
    set({ isAdmin: false, editMode: false });
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  void refreshRole();
  const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
    if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
      // Run after the auth callback completes to avoid nesting Supabase auth calls.
      queueMicrotask(() => { void refreshRole(); });
    }
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "hiraeth-edit-mode") void refreshRole();
  });
}

const server: State = { isAdmin: false, editMode: false };

export function useAdminEdit() {
  useEffect(start, []);
  const s = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => server,
  );
  const toggle = useCallback(() => {
    const next = !state.editMode;
    window.localStorage.setItem("hiraeth-edit-mode", next ? "on" : "off");
    set({ editMode: next && state.isAdmin });
  }, []);
  return { ...s, editing: s.isAdmin && s.editMode, toggle };
}

/** Editable content block stored in public.site_content (public read, admin write). */
export function useSiteContent<T extends Record<string, unknown>>(key: string, defaults: T) {
  const [value, setValue] = useState<T>(defaults);
  useEffect(() => {
    void (supabase as any).from("site_content").select("value").eq("key", key).maybeSingle()
      .then(({ data }: { data: { value: Partial<T> } | null }) => { if (data?.value) setValue({ ...defaults, ...data.value }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const save = useCallback(async (next: T) => {
    const { error } = await (supabase as any).from("site_content")
      .upsert({ key, value: next, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
    setValue(next);
  }, [key]);
  return [value, save] as const;
}

/** Uploads an admin image to the public site-banners bucket and returns its stable public URL. */
export async function uploadSiteImage(file: File, prefix: string) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Formato não permitido pelo armazenamento. Use JPG, PNG ou WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("A imagem deve ter até 5 MB. Reduza o tamanho do arquivo e tente novamente.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const bucket = supabase.storage.from("site-banners");
  const { error } = await bucket.upload(path, file, { contentType: file.type });
  if (error) throw error;
  // The site-banners bucket is public by policy. A public URL avoids signed-link expiry
  // and makes saved images continue working on the published storefront.
  const { data } = bucket.getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Falha ao gerar link público da imagem.");
  return data.publicUrl;
}
