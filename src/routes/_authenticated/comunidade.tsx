import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteLayout";
import { toast } from "sonner";
import { Flame, Heart, ImagePlus, MessageCircle, Send, Trash2, X, UserRound, BookOpen, Film, Tv } from "lucide-react";

type Tab = "inicio" | "chat" | "feed" | "perfil";
type MemberProfile = { username: string; avatar_url: string | null; instagram_url: string | null; tiktok_url: string | null; other_social_url: string | null; bio: string | null };
type Message = { id: string; user_id: string; body: string; created_at: string; is_admin?: boolean; community_profiles?: { username: string; avatar_url: string | null } | null };
type FeedPost = { id: string; user_id: string; body: string; image_urls: string[]; created_at: string; author: string; avatar_url: string | null; heartCount: number; fireCount: number; myReaction: "heart" | "fire" | null; commentCount: number };
type FeedComment = { id: string; post_id: string; user_id: string; body: string; created_at: string; author: string };
type PublicMember = MemberProfile & { user_id: string };
type LibraryCandle = { id: string; title: string; aroma: string | null; image_url: string | null; category?: string | null; acquired_at?: string | null; notes?: string | null; rating?: number | null };

function InterestBookshelf({ items }: { items: { id: string; interest_type: "book" | "movie" | "series" | "other"; title: string; image_url?: string | null }[] }) {
  const [filter, setFilter] = useState<"all" | "movie" | "series" | "book" | "other">("all");
  const visible = filter === "all" ? items : items.filter(item => item.interest_type === filter);
  const filters = [{id:"all",label:"Todos"},{id:"movie",label:"Filmes"},{id:"series",label:"Séries"},{id:"book",label:"Livros"},{id:"other",label:"Outros"}] as const;
  return <div>
    <div className="mb-5 flex flex-wrap gap-2">{filters.map(item => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={"rounded-full border px-3 py-2 text-xs " + (filter === item.id ? "border-primary bg-primary/10 text-primary" : "border-primary/20 text-muted-foreground")}>{item.label}</button>)}</div>
    {visible.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Este universo ainda está sendo construído.</p> : <div className="space-y-3 rounded-xl border border-[#795638]/50 bg-[#eadfc9] p-3 shadow-inner dark:bg-[#30251d]">
      {[0,1,2].map(row => <div key={row} className="flex min-h-[150px] items-end gap-3 overflow-x-auto border-b-[9px] border-[#795638] px-2 pb-2 shadow-[0_5px_5px_-4px_rgba(0,0,0,0.7)]">{visible.filter((_,index) => index % 3 === row).map(item => <article key={item.id} className="w-[88px] shrink-0 text-center"><div className="h-[112px] w-[78px] overflow-hidden rounded-sm border border-[#8c704d] bg-[#d9c8a9] shadow-md">{item.image_url ? <img src={item.image_url} alt={"Capa de " + item.title} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center p-2 text-[10px] font-semibold text-[#60472f]">{item.title}</div>}</div><p className="mt-2 line-clamp-2 text-[11px] font-medium text-[#493725] dark:text-[#f0e4d0]">{item.title}</p></article>)}</div>)}
    </div>}
  </div>;
}

function LibraryGallery({ items }: { items: LibraryCandle[] }) {
  return items.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">{items.map(item => <article key={item.id} className="overflow-hidden border border-primary/20 bg-background/70"><div className="aspect-[4/5] bg-secondary">{item.image_url ? <img src={item.image_url} alt={item.title} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center p-4 text-center font-display text-lg text-primary">{item.title}</div>}</div><div className="p-3"><p className="text-sm font-medium">{item.title}</p>{item.category && <p className="mt-1 text-[10px] uppercase tracking-widest text-primary">{item.category}</p>}{item.aroma && <p className="mt-1 text-xs text-muted-foreground">{item.aroma}</p>}{item.acquired_at && <p className="mt-1 text-xs text-muted-foreground">Adquirida em {new Date(item.acquired_at + "T00:00:00").toLocaleDateString("pt-BR")}</p>}{item.notes && <p className="mt-2 text-xs italic text-muted-foreground">{item.notes}</p>}{item.rating && <p className="mt-2 text-sm" aria-label={"Avaliação pessoal: " + item.rating + " de 5 foguinhos"}>{"🔥".repeat(item.rating)}<span className="text-muted-foreground">{"🔥".repeat(5-item.rating)}</span></p>}</div></article>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">Esta biblioteca ainda não tem velas cadastradas.</p>;
}

export const Route = createFileRoute("/_authenticated/comunidade")({
  head: () => ({ meta: [{ title: "Círculo do Fogo — Hiraeth" }] }),
  component: Comunidade,
});

function Comunidade() {
  const [userId, setUserId] = useState("");
  const [joined, setJoined] = useState(false);
  const [tab, setTab] = useState<Tab>("inicio");
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [profile, setProfile] = useState<MemberProfile>({ username: "", avatar_url: null, instagram_url: null, tiktok_url: null, other_social_url: null, bio: null });
  const [saving, setSaving] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postBody, setPostBody] = useState("");
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [reacting, setReacting] = useState<string | null>(null);
  const [interests, setInterests] = useState<{ id: string; interest_type: "book" | "movie" | "series" | "other"; title: string; image_url?: string | null }[]>([]);
  const [interestTitle, setInterestTitle] = useState("");
  const [interestType, setInterestType] = useState<"book" | "movie" | "series" | "other">("book");
  const [interestCover, setInterestCover] = useState<File | null>(null);
  const [interestUploading, setInterestUploading] = useState(false);
  const [publicMember, setPublicMember] = useState<PublicMember | null>(null);
  const [library, setLibrary] = useState<LibraryCandle[]>([]);
  const [libraryTitle, setLibraryTitle] = useState("");
  const [libraryAroma, setLibraryAroma] = useState("");
  const [libraryCategory, setLibraryCategory] = useState("");
  const [libraryNotes, setLibraryNotes] = useState("");
  const [libraryAcquiredAt, setLibraryAcquiredAt] = useState("");
  const [libraryRating, setLibraryRating] = useState(0);
  const [libraryImage, setLibraryImage] = useState<File | null>(null);
  const [librarySaving, setLibrarySaving] = useState(false);
  const [profileSection, setProfileSection] = useState<"info" | "universe" | "library" | "posts">("info");
  const [publicSection, setPublicSection] = useState<"profile" | "universe" | "library" | "posts">("profile");
  const [publicInterests, setPublicInterests] = useState<typeof interests>([]);
  const [publicLibrary, setPublicLibrary] = useState<LibraryCandle[]>([]);
  const [avatarUploading, setAvatarUploading] = useState(false);

  async function loadInterests(currentUserId = userId) {
    const { data, error } = await (supabase as any).from("community_interests").select("id,interest_type,title,image_url").eq("user_id", currentUserId).order("created_at", { ascending: false });
    if (error) { toast.error("Não foi possível carregar seus interesses."); return; }
    setInterests((data ?? []) as typeof interests);
  }

  async function loadLibrary(currentUserId = userId) {
    const { data, error } = await (supabase as any).from("community_library").select("id,title,aroma,image_url,category,acquired_at,notes,rating").eq("user_id", currentUserId).order("created_at", { ascending: false });
    if (error) { toast.error("Não foi possível carregar sua biblioteca Hiraeth."); return; }
    setLibrary((data ?? []) as LibraryCandle[]);
  }

  async function loadMessages() {
    const { data, error } = await (supabase as any).from("community_messages")
      .select("id,user_id,body,created_at,community_profiles(username,avatar_url)")
      .order("created_at", { ascending: true }).limit(150);
    if (!error) {
      const rows = (data ?? []) as Message[];
      const ids = [...new Set(rows.map(message => message.user_id))];
      const roles = await Promise.all(ids.map(async id => {
        const { data: admin } = await supabase.rpc("has_role", { _user_id: id, _role: "admin" });
        return [id, admin === true] as const;
      }));
      const adminMap = new Map(roles);
      setMessages(rows.map(message => ({ ...message, is_admin: adminMap.get(message.user_id) === true })));
    }
  }

  async function loadFeed(currentUserId = userId) {
    const { data: postRows, error } = await (supabase as any).from("community_posts").select("id,user_id,body,image_urls,created_at").order("created_at", { ascending: false }).limit(60);
    if (error) { toast.error("Não foi possível carregar o Feed."); return; }
    const rows = postRows ?? [];
    if (!rows.length) { setPosts([]); return; }
    const ids = rows.map((p: any) => p.id);
    const users = [...new Set(rows.map((p: any) => p.user_id))];
    const [{ data: profiles }, { data: reactions }, { data: commentRows }] = await Promise.all([
      (supabase as any).from("community_profiles").select("user_id,username,avatar_url").in("user_id", users),
      (supabase as any).from("community_post_reactions").select("post_id,user_id,reaction_type").in("post_id", ids),
      (supabase as any).from("community_post_comments").select("post_id").in("post_id", ids),
    ]);
    const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id, p]));
    setPosts(rows.map((p: any) => {
      const postReactions = (reactions ?? []).filter((r: any) => r.post_id === p.id);
      const own = postReactions.find((r: any) => r.user_id === currentUserId);
      return {
        ...p,
        author: profileMap.get(p.user_id)?.username || "Integrante",
        avatar_url: profileMap.get(p.user_id)?.avatar_url || null,
        heartCount: postReactions.filter((r: any) => r.reaction_type === "heart").length,
        fireCount: postReactions.filter((r: any) => r.reaction_type === "fire").length,
        myReaction: own?.reaction_type ?? null,
        commentCount: (commentRows ?? []).filter((c: any) => c.post_id === p.id).length,
      };
    }));
  }

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setLoading(false); return; }
      setUserId(data.user.id);
      const { data: membership } = await (supabase as any).from("community_memberships").select("user_id").eq("user_id", data.user.id).maybeSingle();
      if (membership) {
        setJoined(true);
        const { data: p } = await (supabase as any).from("community_profiles").select("*").eq("user_id", data.user.id).maybeSingle();
        if (p) setProfile(p);
        await Promise.all([loadMessages(), loadFeed(data.user.id), loadInterests(data.user.id), loadLibrary(data.user.id)]);
      }
      setLoading(false);
    })();
  }, []);

  async function joinCommunity() {
    if (!userId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("community_memberships").insert({ user_id: userId });
    if (error && error.code !== "23505") { toast.error("Não foi possível concluir sua participação."); setSaving(false); return; }
    setJoined(true);
    const { data: auth } = await supabase.auth.getUser();
    const suggested = auth.user?.user_metadata?.["display_name"] || auth.user?.email?.split("@")[0] || "integrante";
    const { error: profileError } = await (supabase as any).from("community_profiles").upsert({ user_id: userId, username: String(suggested).slice(0, 30) }, { onConflict: "user_id" });
    if (profileError) toast.error("Você entrou, mas ainda precisamos configurar seu perfil.");
    else setProfile(current => ({ ...current, username: String(suggested).slice(0, 30) }));
    setSaving(false);
    await Promise.all([loadMessages(), loadFeed(), loadInterests(), loadLibrary()]);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !userId) return;
    const { error } = await (supabase as any).from("community_messages").insert({ user_id: userId, body: text });
    if (error) { toast.error("Não foi possível enviar sua mensagem."); return; }
    setBody("");
    await loadMessages();
  }

  async function publishPost(e: React.FormEvent) {
    e.preventDefault();
    if (!postBody.trim() && postFiles.length === 0) { toast.error("Escreva algo ou escolha uma foto para publicar."); return; }
    if (postFiles.length > 4) { toast.error("Escolha até 4 fotos por publicação."); return; }
    setPosting(true);
    try {
      const imageUrls: string[] = [];
      for (const file of postFiles) {
        if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) throw new Error("Escolha imagens de até 8 MB cada.");
        const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
        const path = `public/community-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("review-media").upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        imageUrls.push(supabase.storage.from("review-media").getPublicUrl(path).data.publicUrl);
      }
      const { error } = await (supabase as any).from("community_posts").insert({ user_id: userId, body: postBody.trim(), image_urls: imageUrls });
      if (error) throw error;
      setPostBody(""); setPostFiles([]);
      const picker = document.getElementById("community-post-images") as HTMLInputElement | null;
      if (picker) picker.value = "";
      toast.success("Sua publicação foi compartilhada!");
      setComposerOpen(false);
      await loadFeed();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível publicar.");
    } finally { setPosting(false); }
  }

  async function reactToPost(post: FeedPost, type: "heart" | "fire") {
    if (reacting) return;
    setReacting(post.id);
    try {
      if (post.myReaction === type) {
        const { error } = await (supabase as any).from("community_post_reactions").delete().eq("post_id", post.id).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("community_post_reactions").upsert({ post_id: post.id, user_id: userId, reaction_type: type }, { onConflict: "post_id,user_id" });
        if (error) throw error;
      }
      await loadFeed();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível registrar sua reação."); }
    finally { setReacting(null); }
  }

  async function loadComments(postId: string) {
    const { data, error } = await (supabase as any).from("community_post_comments").select("id,post_id,user_id,body,created_at").eq("post_id", postId).order("created_at", { ascending: true });
    if (error) { toast.error("Não foi possível carregar os comentários."); return; }
    const userIds = [...new Set((data ?? []).map((c: any) => c.user_id))];
    const { data: people } = userIds.length ? await (supabase as any).from("community_profiles").select("user_id,username").in("user_id", userIds) : { data: [] };
    const names = new Map((people ?? []).map((p: any) => [p.user_id, p.username]));
    setComments(current => ({ ...current, [postId]: (data ?? []).map((c: any) => ({ ...c, author: names.get(c.user_id) || "Integrante" })) }));
  }

  async function toggleComments(postId: string) {
    if (openComments === postId) { setOpenComments(null); return; }
    setOpenComments(postId);
    await loadComments(postId);
  }

  async function addComment(e: React.FormEvent, postId: string) {
    e.preventDefault();
    const text = (commentDrafts[postId] ?? "").trim();
    if (!text) return;
    const { error } = await (supabase as any).from("community_post_comments").insert({ post_id: postId, user_id: userId, body: text });
    if (error) { toast.error("Não foi possível enviar o comentário."); return; }
    setCommentDrafts(current => ({ ...current, [postId]: "" }));
    await Promise.all([loadComments(postId), loadFeed()]);
  }

  async function deletePost(post: FeedPost) {
    if (post.user_id !== userId || !window.confirm("Deseja excluir esta publicação?")) return;
    const { error } = await (supabase as any).from("community_posts").delete().eq("id", post.id).eq("user_id", userId);
    if (error) toast.error("Não foi possível excluir a publicação.");
    else { toast.success("Publicação excluída."); await loadFeed(); }
  }

  async function uploadAvatar(file?: File) {
    if (!file || !userId) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) { toast.error("Escolha uma imagem de até 8 MB."); return; }
    setAvatarUploading(true);
    const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const path = `public/avatar-${userId}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("review-media").upload(path, file, { contentType: file.type, upsert: false });
    if (error) toast.error("Não foi possível enviar sua foto.");
    else {
      const url = supabase.storage.from("review-media").getPublicUrl(path).data.publicUrl;
      setProfile(current => ({ ...current, avatar_url: url }));
      const { error: saveError } = await (supabase as any).from("community_profiles").upsert({ user_id: userId, avatar_url: url }, { onConflict: "user_id" });
      if (saveError) toast.error("A foto foi enviada, mas não foi possível atualizar o perfil."); else toast.success("Foto de perfil atualizada!");
    }
    setAvatarUploading(false);
  }

  async function addInterest(e: React.FormEvent) {
    e.preventDefault(); const title = interestTitle.trim(); if (!title) return;
    setInterestUploading(true);
    try {
      let image_url: string | null = null;
      if (interestCover) {
        if (!interestCover.type.startsWith("image/") || interestCover.size > 8 * 1024 * 1024) throw new Error("Escolha uma capa de até 8 MB.");
        const ext = interestCover.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
        const path = "public/universe-" + userId + "-" + crypto.randomUUID() + "." + ext;
        const { error: uploadError } = await supabase.storage.from("review-media").upload(path, interestCover, { contentType: interestCover.type, upsert: false });
        if (uploadError) throw uploadError;
        image_url = supabase.storage.from("review-media").getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await (supabase as any).from("community_interests").insert({ user_id: userId, interest_type: interestType, title, image_url }).select("id,interest_type,title,image_url").single();
      if (error) throw error;
      setInterests(current => [data, ...current]); setInterestTitle(""); setInterestCover(null);
      const picker = document.getElementById("community-interest-cover") as HTMLInputElement | null; if (picker) picker.value = "";
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível adicionar esse interesse."); }
    finally { setInterestUploading(false); }
  }

  async function removeInterest(id: string) {
    const { error } = await (supabase as any).from("community_interests").delete().eq("id", id).eq("user_id", userId);
    if (error) toast.error("Não foi possível remover esse interesse."); else setInterests(current => current.filter(item => item.id !== id));
  }

  async function addLibraryCandle(e: React.FormEvent) {
    e.preventDefault(); const title = libraryTitle.trim(); if (!title) return;
    setLibrarySaving(true);
    try {
      let image_url: string | null = null;
      if (libraryImage) {
        if (!libraryImage.type.startsWith("image/") || libraryImage.size > 8 * 1024 * 1024) throw new Error("Escolha uma foto de até 8 MB.");
        const ext = libraryImage.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
        const path = "public/library-" + userId + "-" + crypto.randomUUID() + "." + ext;
        const { error: uploadError } = await supabase.storage.from("review-media").upload(path, libraryImage, { contentType: libraryImage.type, upsert: false });
        if (uploadError) throw uploadError;
        image_url = supabase.storage.from("review-media").getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await (supabase as any).from("community_library").insert({ user_id: userId, title, aroma: libraryAroma.trim() || null, image_url, category: libraryCategory.trim() || null, notes: libraryNotes.trim() || null, acquired_at: libraryAcquiredAt || null, rating: libraryRating || null }).select("id,title,aroma,image_url,category,acquired_at,notes,rating").single();
      if (error) throw error;
      setLibrary(current => [data, ...current]); setLibraryTitle(""); setLibraryAroma(""); setLibraryCategory(""); setLibraryNotes(""); setLibraryAcquiredAt(""); setLibraryRating(0); setLibraryImage(null);
      const picker = document.getElementById("community-library-image") as HTMLInputElement | null; if (picker) picker.value = "";
      toast.success("Vela adicionada à sua biblioteca!");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível adicionar a vela."); }
    finally { setLibrarySaving(false); }
  }

  async function removeLibraryCandle(id: string) {
    const { error } = await (supabase as any).from("community_library").delete().eq("id", id).eq("user_id", userId);
    if (error) toast.error("Não foi possível remover esta vela.");
    else setLibrary(current => current.filter(item => item.id !== id));
  }

  async function openPublicProfile(memberId: string) {
    if (memberId === userId) { setPublicMember(null); setTab("perfil"); return; }
    const { data, error } = await (supabase as any).from("community_profiles").select("user_id,username,avatar_url,bio,instagram_url,tiktok_url,other_social_url").eq("user_id", memberId).maybeSingle();
    if (error || !data) { toast.error("Não foi possível abrir este perfil."); return; }
    setPublicMember(data as PublicMember); setPublicSection("profile");
    const [{ data: interestsData }, { data: libraryData }] = await Promise.all([
      (supabase as any).from("community_interests").select("id,interest_type,title,image_url").eq("user_id", memberId).order("created_at", { ascending: false }),
      (supabase as any).from("community_library").select("id,title,aroma,image_url,category,acquired_at,notes,rating").eq("user_id", memberId).order("created_at", { ascending: false }),
    ]);
    setPublicInterests((interestsData ?? []) as typeof interests); setPublicLibrary((libraryData ?? []) as LibraryCandle[]);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await (supabase as any).from("community_profiles").upsert({ user_id: userId, ...profile, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error("Não foi possível salvar seu perfil.");
    else toast.success("Perfil atualizado.");
  }

  useEffect(() => {
    if (!joined) return;
    const channel = supabase.channel("circulo-do-fogo-chat")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_messages" }, () => { void loadMessages(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [joined]);

  const tabs: { id: Tab; label: string }[] = [{ id: "inicio", label: "Início" }, { id: "chat", label: "Chat" }, { id: "feed", label: "Feed" }, { id: "perfil", label: "Meu perfil" }];

  return <div className="min-h-screen bg-background"><SiteHeader />
    {publicMember && <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/70 p-3 md:p-8" role="dialog" aria-modal="true" aria-label={"Perfil de " + publicMember.username}>
      <section className="relative mx-auto my-4 min-h-[80vh] w-full max-w-5xl rounded-xl border border-primary/20 bg-card p-5 shadow-2xl md:p-8">
        <button type="button" onClick={() => setPublicMember(null)} className="absolute right-3 top-3 z-10 rounded-full p-2 hover:bg-primary/10" aria-label="Fechar perfil"><X size={18}/></button>
        <div className="flex flex-col items-center gap-3 border-b border-primary/15 pb-6 text-center"><div className="h-24 w-24 overflow-hidden rounded-full border-2 border-primary/30 bg-secondary">{publicMember.avatar_url ? <img src={publicMember.avatar_url} alt={"Foto de " + publicMember.username} className="h-full w-full object-cover"/> : <UserRound className="m-auto mt-7" size={34}/>}</div><h2 className="font-display text-3xl">{publicMember.username}</h2>{publicMember.bio && <p className="max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">{publicMember.bio}</p>}<div className="flex flex-wrap justify-center gap-4 text-sm">{publicMember.instagram_url && <a href={publicMember.instagram_url} target="_blank" rel="noreferrer" className="text-primary underline">Instagram</a>}{publicMember.tiktok_url && <a href={publicMember.tiktok_url} target="_blank" rel="noreferrer" className="text-primary underline">TikTok</a>}{publicMember.other_social_url && <a href={publicMember.other_social_url} target="_blank" rel="noreferrer" className="text-primary underline">Outra rede</a>}</div></div>
        <nav className="sticky top-0 z-10 -mx-5 mt-5 grid grid-cols-4 border-b border-primary/20 bg-card/95 md:-mx-8">{([{id:"profile",label:"Perfil"},{id:"universe",label:"Meu Universo"},{id:"library",label:"Minha Biblioteca"},{id:"posts",label:"Publicações"}] as const).map(item => <button key={item.id} type="button" onClick={() => setPublicSection(item.id)} className={"border-b-2 px-1 py-3 text-xs font-medium md:text-sm " + (publicSection === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>{item.label}</button>)}</nav>
        {publicSection === "profile" && <section className="mx-auto max-w-3xl py-10 text-center"><p className="eyebrow">Círculo do Fogo</p><h3 className="mt-2 font-display text-2xl">Um pouco sobre {publicMember.username}</h3><p className="mt-3 text-sm text-muted-foreground">Explore os interesses, a coleção Hiraeth e as publicações pelas abas acima.</p></section>}
        {publicSection === "universe" && <section className="py-6"><p className="eyebrow">Livros, telas e paixões</p><h3 className="mb-5 font-display text-3xl">Meu Universo</h3><InterestBookshelf items={publicInterests}/></section>}
        {publicSection === "library" && <section className="py-6"><p className="eyebrow">Coleção de velas</p><h3 className="mb-5 font-display text-3xl">Minha Biblioteca</h3><LibraryGallery items={publicLibrary}/></section>}
        {publicSection === "posts" && <section className="mx-auto max-w-3xl space-y-5 py-6"><h3 className="font-display text-3xl">Publicações</h3>{posts.filter(post => post.user_id === publicMember.user_id).map(post => <article key={post.id} className="border border-primary/20 bg-background/60 p-4">{post.body && <p className="whitespace-pre-wrap text-sm">{post.body}</p>}{post.image_urls?.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{post.image_urls.map(url => <img key={url} src={url} alt="Foto publicada" className="aspect-square w-full object-cover"/>)}</div>}<time className="mt-3 block text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString("pt-BR")}</time></article>)}{posts.filter(post => post.user_id === publicMember.user_id).length === 0 && <p className="text-sm text-muted-foreground">Ainda não há publicações por aqui.</p>}</section>}
      </section>
    </div>}



    <main className="w-full px-0 pb-0 pt-0">
      <div className="min-h-[calc(100dvh-4rem)] w-full overflow-hidden border-y border-primary/25 bg-card">
        {!loading && joined &&           <nav className="sticky top-0 z-20 grid grid-cols-4 border-b border-primary/20 bg-card/95 shadow-sm backdrop-blur" aria-label="Áreas da comunidade">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`min-h-14 border-b-2 px-3 py-4 text-sm font-medium transition-colors md:min-h-16 md:text-base ${tab === item.id ? "border-primary bg-primary/5 text-primary" : "border-transparent text-muted-foreground hover:bg-primary/5"}`}>{item.label}</button>)}</nav>}
        {(!joined || tab === "inicio") && <div className="relative flex min-h-[260px] items-end overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_rgba(190,151,83,0.25),_transparent_45%),linear-gradient(125deg,#101b14,#263d2c_58%,#111b15)] px-6 py-10 md:min-h-[320px] md:px-14 md:py-14">
          <div className="relative max-w-3xl"><p className="text-xs uppercase tracking-[0.38em] text-[#d5bd82]">✦ Comunidade Hiraeth ✦</p><h1 className="mt-4 font-display text-5xl leading-none text-[#f5edda] md:text-7xl">Círculo do Fogo</h1><p className="mt-5 max-w-xl text-base leading-7 text-[#eee5d3]/85 md:text-lg">Histórias aproximam. Conversas acendem novas ideias. Encontre pessoas que sentem o mundo através dos livros, filmes e universos que amam.</p><p className="mt-7 text-xs uppercase tracking-[0.2em] text-[#d5bd82]">Um espaço para pertencer</p></div>
        </div>}
        {loading ? <p className="p-8 text-muted-foreground">Carregando...</p> : !joined ? <section className="mx-auto max-w-4xl px-6 py-16 text-center md:py-24">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary"><Flame size={30}/></div><p className="eyebrow tracking-[0.3em]">Sua comunidade começa aqui</p><h2 className="mt-4 font-display text-4xl md:text-5xl">Sua próxima conexão começa aqui</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground">O Círculo do Fogo é o ponto de encontro de quem ama histórias. Converse, compartilhe suas descobertas, mostre o que está lendo e encontre pessoas que entendem os universos que fazem parte de você.</p>
          <button onClick={() => void joinCommunity()} disabled={saving} className="btn-gold mt-9 min-h-14 px-10 text-sm uppercase tracking-[0.16em] shadow-lg shadow-primary/10">{saving ? "Entrando..." : "Participar da comunidade"}</button>
        </section> : <>

          {tab === "inicio" && <section className="mx-auto w-full max-w-6xl space-y-12 px-5 py-10 md:px-10 md:py-14">
            <div className="mx-auto max-w-3xl text-center">
              <p className="eyebrow tracking-[0.28em]">Mais do que uma comunidade, um lugar para pertencer</p>
              <h2 className="mt-3 font-display text-3xl md:text-5xl">Aqui, toda história encontra companhia.</h2>
              <p className="mt-5 text-base leading-8 text-muted-foreground md:text-lg">O Círculo do Fogo é o espaço de encontro da Hiraeth para quem encontra nas histórias um jeito de sentir, imaginar e se conectar. É um lugar para conversar sobre livros, filmes e séries, dividir descobertas, conhecer pessoas com gostos parecidos e criar novas lembranças em torno dos universos que amamos.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <article className="rounded-xl border border-primary/20 bg-background p-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><MessageCircle/></div><h3 className="font-display text-2xl">Converse no Chat</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">Participe das conversas em tempo real, troque ideias, faça perguntas e fale sobre aquilo que está lendo ou assistindo. É o cantinho para uma conversa espontânea entre integrantes.</p></article>
              <article className="rounded-xl border border-primary/20 bg-background p-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><ImagePlus/></div><h3 className="font-display text-2xl">Compartilhe no Feed</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">Publique fotos, opiniões, trechos de experiências e descobertas. Reaja às publicações com corações e foguinhos, comente e participe do que outras pessoas estão compartilhando.</p></article>
              <article className="rounded-xl border border-primary/20 bg-background p-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><BookOpen/></div><h3 className="font-display text-2xl">Mostre seu Universo</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">No seu perfil, conte um pouco sobre você e monte seu Universo com capas e títulos de livros, filmes e séries que fazem parte da sua história. Descubra afinidades com outros integrantes.</p></article>
            </div>
            <div className="grid gap-8 rounded-xl border border-primary/20 bg-background/70 p-6 md:grid-cols-2 md:p-9">
              <div><p className="eyebrow">Nosso propósito</p><h3 className="mt-2 font-display text-3xl">Um espaço feito de respeito e afeto.</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">Cada pessoa vive uma história de um jeito. Aqui, opiniões diferentes são bem-vindas: converse com gentileza, respeite o gosto de cada integrante, dê crédito quando compartilhar algo de outra pessoa e ajude a manter um ambiente acolhedor.</p></div>
              <div><p className="eyebrow">Como começar</p><ol className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground"><li><strong className="text-foreground">01. Apresente-se:</strong> personalize seu perfil e conte um pouco sobre você.</li><li><strong className="text-foreground">02. Abra uma conversa:</strong> passe pelo Chat e conheça quem está por aqui.</li><li><strong className="text-foreground">03. Compartilhe:</strong> publique no Feed e adicione seus favoritos ao Meu Universo.</li></ol></div>
            </div>
            <div className="text-center"><p className="font-display text-2xl italic text-primary">Acenda uma conversa. Compartilhe uma história. Faça parte do Círculo.</p><button type="button" onClick={() => setTab("chat")} className="btn-gold mt-5">Ir para o Chat</button></div>
          </section>}
          {tab === "chat" && <section className="flex h-[calc(100dvh-9.5rem)] min-h-[420px] flex-col bg-[#f4f0e7] dark:bg-[#172019]"><div className="flex items-center gap-3 border-b border-primary/15 bg-card px-4 py-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#20382b] text-[#e8d8b4]"><Flame size={20}/></div><div><h2 className="font-display text-lg">Chat</h2></div></div><div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_20%_20%,rgba(179,148,91,0.08),transparent_30%)] px-3 py-5 md:px-8">{messages.map(message => <article key={message.id} className={`max-w-[90%] rounded-md border p-3 ${message.is_admin ? "border-emerald-700/40 bg-emerald-50/70" : message.user_id === userId ? "ml-auto border-primary/30 bg-primary/5" : "border-border bg-card"}`}><p className={`mb-1 text-xs font-semibold ${message.is_admin ? "text-emerald-700" : "text-primary"}`}>{message.is_admin ? "Hiraeth — Mari" : <button type="button" onClick={() => void openPublicProfile(message.user_id)} className="hover:underline">{message.community_profiles?.username || "Integrante"}</button>}</p><p className="whitespace-pre-wrap text-sm">{message.body}</p><time className="mt-2 block text-right text-[10px] text-muted-foreground">{new Date(message.created_at).toLocaleString("pt-BR")}</time></article>)}{messages.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">A conversa começa com você. Deixe a primeira mensagem!</p>}</div><form onSubmit={sendMessage} className="sticky bottom-0 flex items-center gap-2 border-t border-primary/15 bg-card px-3 py-3 md:px-6"><input value={body} onChange={e => setBody(e.target.value)} maxLength={3000} placeholder="Digite uma mensagem..." className="min-w-0 flex-1 rounded-full border border-primary/20 bg-background px-4 py-3 text-sm outline-none focus:border-primary" /><button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#20382b] text-[#f5edda]" type="submit" aria-label="Enviar mensagem"><Send size={18}/></button></form></section>}
          {tab === "feed" && <section className="min-h-[calc(100dvh-9.5rem)] space-y-5 px-0 pb-8"><h2 className="px-4 pt-5 font-display text-2xl md:px-8">Feed</h2><div className="border-b border-primary/15 bg-background px-4 py-4 md:px-8"><button type="button" onClick={() => setComposerOpen(true)} className="flex w-full items-center gap-3 text-left"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#20382b] text-[#e8d8b4]"><ImagePlus size={20}/></span><span className="min-w-0 flex-1"><strong className="block text-sm font-medium">Criar uma publicação</strong><span className="text-xs text-muted-foreground">Compartilhe uma leitura, foto ou pensamento...</span></span><span className="rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">Criar post</span></button></div>{composerOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3" role="dialog" aria-modal="true" aria-label="Criar publicação"><div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-primary/25 bg-card shadow-2xl"><div className="flex items-center justify-between border-b border-primary/15 px-5 py-4"><h3 className="font-display text-2xl">Nova publicação</h3><button type="button" onClick={() => { if ((postBody.trim() || postFiles.length) && !window.confirm("Descartar esta publicação?")) return; setComposerOpen(false); setPostBody(""); setPostFiles([]); }} className="rounded-full p-2 hover:bg-primary/10" aria-label="Fechar"><X/></button></div><form onSubmit={async e => { await publishPost(e); }} className="mx-auto max-w-3xl space-y-3 border-t border-primary/10 p-4 md:p-6">
              <textarea value={postBody} onChange={e => setPostBody(e.target.value)} maxLength={5000} rows={4} placeholder="O que está passando pela sua cabeça?" className="w-full resize-y border border-primary/20 bg-card p-3 text-sm outline-none focus:border-primary" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ImagePlus size={18}/> Adicionar fotos<input id="community-post-images" type="file" accept="image/*" multiple className="sr-only" onChange={e => setPostFiles(Array.from(e.target.files ?? []).slice(0, 4))}/></label>
                <button type="submit" disabled={posting} className="btn-gold inline-flex items-center gap-2">{posting ? "Publicando..." : "Publicar"} <Send size={15}/></button>
              </div>
              {postFiles.length > 0 && <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{postFiles.length} foto(s) selecionada(s): {postFiles.map(file => file.name).join(", ")}</span><button type="button" onClick={() => { setPostFiles([]); const el = document.getElementById("community-post-images") as HTMLInputElement | null; if (el) el.value = ""; }} aria-label="Remover fotos selecionadas"><X size={15}/></button></div>}
              <p className="text-[11px] text-muted-foreground">Até 4 fotos por publicação, com limite de 8 MB por imagem.</p>
            </form></div></div>}<div className="mx-auto w-full max-w-3xl space-y-5 px-3 md:px-6">
            {posts.length === 0 ? <div className="border border-dashed border-primary/30 px-5 py-12 text-center"><Flame className="mx-auto text-primary" size={30}/><p className="mt-3 font-display text-xl">A primeira chama do Feed pode ser sua</p><p className="mt-1 text-sm text-muted-foreground">Compartilhe uma foto ou escreva algo para começar.</p></div> : posts.map(post => <article key={post.id} className="overflow-hidden border border-primary/20 bg-background/60">
              <div className="flex items-start gap-3 p-4">
                {post.avatar_url ? <button type="button" onClick={() => void openPublicProfile(post.user_id)} aria-label={"Abrir perfil de " + post.author}><img src={post.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/></button> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#20382b] text-[#e8d8b4]">{post.author.slice(0,1).toUpperCase()}</div>}
                <div className="min-w-0 flex-1"><button type="button" onClick={() => void openPublicProfile(post.user_id)} className="text-sm font-semibold hover:text-primary hover:underline">{post.author}</button><time className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString("pt-BR")}</time></div>
                {post.user_id === userId && <button type="button" onClick={() => void deletePost(post)} aria-label="Excluir publicação" className="rounded p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16}/></button>}
              </div>
              {post.body && <p className="whitespace-pre-wrap px-4 pb-4 text-sm leading-relaxed">{post.body}</p>}
              {post.image_urls?.length > 0 && <div className={`grid gap-1 ${post.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{post.image_urls.map(url => <img key={url} src={url} alt="Foto compartilhada no Círculo do Fogo" loading="lazy" className={`w-full object-cover ${post.image_urls.length === 1 ? "max-h-[560px]" : "aspect-square"}`}/>)}</div>}
              <div className="flex flex-wrap items-center gap-2 border-t border-primary/10 px-3 py-3">
                <button type="button" disabled={reacting === post.id} onClick={() => void reactToPost(post, "heart")} aria-pressed={post.myReaction === "heart"} className={`${post.myReaction === "heart" ? "community-heart-active " : ""}inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors ${post.myReaction === "heart" ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-transparent text-muted-foreground hover:bg-emerald-50 hover:text-emerald-800"}`}><Heart size={18} fill={post.myReaction === "heart" ? "currentColor" : "none"}/> <span>{post.heartCount}</span><span className="sr-only">corações verdes</span></button>
                <button type="button" disabled={reacting === post.id} onClick={() => void reactToPost(post, "fire")} aria-pressed={post.myReaction === "fire"} className={`${post.myReaction === "fire" ? "community-fire-active " : ""}inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors ${post.myReaction === "fire" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-transparent text-muted-foreground hover:bg-orange-50 hover:text-orange-700"}`}><Flame size={19} fill={post.myReaction === "fire" ? "currentColor" : "none"}/> <span>{post.fireCount}</span><span className="sr-only">foguinhos</span></button>
                <button type="button" onClick={() => void toggleComments(post.id)} className="ml-auto inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-primary/5 hover:text-primary"><MessageCircle size={17}/> {post.commentCount} comentários</button>
              </div>
              {openComments === post.id && <div className="space-y-3 border-t border-primary/10 bg-card/40 p-4">
                {(comments[post.id] ?? []).map(comment => <div key={comment.id} className="text-sm"><span className="font-semibold text-primary">{comment.author}</span><p className="mt-0.5 whitespace-pre-wrap">{comment.body}</p><time className="text-[10px] text-muted-foreground">{new Date(comment.created_at).toLocaleString("pt-BR")}</time></div>)}
                {(comments[post.id] ?? []).length === 0 && <p className="text-xs text-muted-foreground">Seja a primeira pessoa a comentar.</p>}
                <form onSubmit={e => void addComment(e, post.id)} className="flex gap-2"><input value={commentDrafts[post.id] ?? ""} onChange={e => setCommentDrafts(current => ({ ...current, [post.id]: e.target.value }))} maxLength={2000} placeholder="Escreva um comentário..." className="min-w-0 flex-1 border bg-background px-3 py-2 text-sm"/><button type="submit" aria-label="Enviar comentário" className="btn-gold px-3"><Send size={16}/></button></form>
              </div>}
            </article>)}
          </div></section>}
          {tab === "perfil" && <section className="mx-auto w-full max-w-6xl px-4 py-7 md:px-8 md:py-10">
            <div className="mb-6"><p className="eyebrow">Sua presença no Círculo</p><h2 className="mt-1 font-display text-3xl">Meu perfil</h2><p className="mt-2 text-sm text-muted-foreground">Cuide das suas informações, reúna seus universos favoritos e mostre sua coleção Hiraeth.</p></div>
            <nav className="mb-7 grid grid-cols-2 border-b border-primary/20 sm:grid-cols-4">{([{id:"info",label:"Informações"},{id:"universe",label:"Meu Universo"},{id:"library",label:"Minha Biblioteca"},{id:"posts",label:"Publicações"}] as const).map(item => <button key={item.id} type="button" onClick={() => setProfileSection(item.id)} className={"border-b-2 px-2 py-3 text-sm " + (profileSection === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>{item.label}</button>)}</nav>
            {profileSection === "info" && <form onSubmit={saveProfile} className="mx-auto grid max-w-2xl gap-4 rounded-xl border border-primary/20 bg-background/60 p-5 md:p-7"><div className="flex items-center gap-4"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-[#20382b] text-[#e8d8b4]">{profile.avatar_url ? <img src={profile.avatar_url} alt="Sua foto de perfil" className="h-full w-full object-cover"/> : <UserRound size={34}/>}</div><label className="cursor-pointer text-sm text-primary underline">{avatarUploading ? "Enviando foto..." : "Alterar foto de perfil"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={avatarUploading} onChange={e => void uploadAvatar(e.target.files?.[0])}/></label></div>
              <label className="grid gap-2 text-sm">Nome de usuário<input required maxLength={30} value={profile.username} onChange={e => setProfile({ ...profile, username: e.target.value })} className="border bg-transparent p-3"/></label><label className="grid gap-2 text-sm">Sobre mim<textarea maxLength={500} value={profile.bio ?? ""} onChange={e => setProfile({ ...profile, bio: e.target.value })} className="border bg-transparent p-3" rows={3}/></label><label className="grid gap-2 text-sm">Instagram<input value={profile.instagram_url ?? ""} onChange={e => setProfile({ ...profile, instagram_url: e.target.value })} className="border bg-transparent p-3" placeholder="https://instagram.com/..."/></label><label className="grid gap-2 text-sm">TikTok<input value={profile.tiktok_url ?? ""} onChange={e => setProfile({ ...profile, tiktok_url: e.target.value })} className="border bg-transparent p-3" placeholder="https://tiktok.com/@..."/></label><label className="grid gap-2 text-sm">Outra rede social<input value={profile.other_social_url ?? ""} onChange={e => setProfile({ ...profile, other_social_url: e.target.value })} className="border bg-transparent p-3"/></label><button disabled={saving} className="btn-gold justify-self-start">{saving ? "Salvando..." : "Salvar perfil"}</button></form>}
            {profileSection === "universe" && <section className="rounded-xl border border-primary/20 bg-background/60 p-5 md:p-7"><p className="eyebrow">Livros, telas e paixões</p><h3 className="mt-1 font-display text-3xl">Meu Universo</h3><p className="mt-1 text-sm text-muted-foreground">Adicione livros, filmes, séries e outros interesses. Eles ficam organizados em uma estante com três prateleiras.</p><form onSubmit={addInterest} className="mt-5 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]"><select value={interestType} onChange={e => setInterestType(e.target.value as typeof interestType)} className="border bg-background px-3 py-2 text-sm"><option value="book">Livro</option><option value="movie">Filme</option><option value="series">Série</option><option value="other">Outro</option></select><input value={interestTitle} onChange={e => setInterestTitle(e.target.value)} maxLength={160} placeholder="Nome do livro, filme, série..." className="min-w-0 border bg-background px-3 py-2 text-sm"/><button type="submit" disabled={interestUploading} className="btn-gold">{interestUploading ? "Salvando..." : "Adicionar"}</button><label className="sm:col-span-3 flex cursor-pointer items-center gap-2 text-xs text-primary underline">Adicionar capa (opcional)<input id="community-interest-cover" type="file" accept="image/*" className="sr-only" onChange={e => setInterestCover(e.target.files?.[0] ?? null)}/></label>{interestCover && <p className="sm:col-span-3 text-xs text-muted-foreground">{interestCover.name}</p>}</form><div className="mt-7"><InterestBookshelf items={interests}/></div><div className="mt-6 flex flex-wrap gap-2">{interests.map(item => <button key={item.id} type="button" onClick={() => void removeInterest(item.id)} className="rounded-full border border-primary/20 px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive">Remover {item.title} ×</button>)}</div></section>}
            {profileSection === "library" && <section className="rounded-xl border border-primary/20 bg-background/60 p-5 md:p-7"><p className="eyebrow">Sua coleção Hiraeth</p><h3 className="mt-1 font-display text-3xl">Minha Biblioteca</h3><p className="mt-1 text-sm text-muted-foreground">Este espaço é separado do Meu Universo e reúne as velas Hiraeth que fazem parte da sua coleção.</p><form onSubmit={addLibraryCandle} className="mt-5 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Nome da vela<input required maxLength={160} value={libraryTitle} onChange={e => setLibraryTitle(e.target.value)} className="border bg-background p-3" placeholder="Ex.: Chapéu Seletor"/></label><label className="grid gap-1 text-sm">Categoria ou universo (opcional)<input maxLength={100} value={libraryCategory} onChange={e => setLibraryCategory(e.target.value)} className="border bg-background p-3" placeholder="Ex.: Harry Potter, Friends"/></label><label className="grid gap-1 text-sm">Aroma (opcional)<input maxLength={160} value={libraryAroma} onChange={e => setLibraryAroma(e.target.value)} className="border bg-background p-3" placeholder="Nome do aroma"/></label><label className="grid gap-1 text-sm">Data da compra (opcional)<input type="date" value={libraryAcquiredAt} onChange={e => setLibraryAcquiredAt(e.target.value)} className="border bg-background p-3"/></label><div className="sm:col-span-2"><p className="mb-1 text-sm">Sua avaliação pessoal</p><div className="flex gap-1" role="group" aria-label="Avalie o aroma com até cinco foguinhos">{[1,2,3,4,5].map(n => <button key={n} type="button" onClick={() => setLibraryRating(n)} aria-label={n + " foguinhos"} className={"text-2xl " + (n <= libraryRating ? "text-orange-500" : "text-muted-foreground/40")}>🔥</button>)}</div></div><label className="grid gap-1 text-sm sm:col-span-2">Anotação pessoal (visível no perfil)<textarea value={libraryNotes} onChange={e => setLibraryNotes(e.target.value)} rows={2} className="border bg-background p-3" placeholder="O que essa vela representa para você?"/></label><label className="sm:col-span-2 flex cursor-pointer items-center gap-2 text-xs text-primary underline">Adicionar foto da vela (opcional)<input id="community-library-image" type="file" accept="image/*" className="sr-only" onChange={e => setLibraryImage(e.target.files?.[0] ?? null)}/></label>{libraryImage && <p className="sm:col-span-2 text-xs text-muted-foreground">{libraryImage.name}</p>}<button type="submit" disabled={librarySaving} className="btn-gold justify-self-start">{librarySaving ? "Salvando..." : "Adicionar à biblioteca"}</button></form><div className="mt-7"><LibraryGallery items={library}/></div><div className="mt-4 flex flex-wrap gap-2">{library.map(item => <button key={item.id} type="button" onClick={() => void removeLibraryCandle(item.id)} className="rounded-full border border-primary/20 px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive">Remover {item.title} ×</button>)}</div></section>}
            {profileSection === "posts" && <section className="mx-auto max-w-3xl space-y-4"><h3 className="font-display text-3xl">Minhas publicações</h3>{posts.filter(post => post.user_id === userId).map(post => <article key={post.id} className="border border-primary/20 bg-background/60 p-4"><p className="whitespace-pre-wrap text-sm">{post.body}</p>{post.image_urls?.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{post.image_urls.map(url => <img key={url} src={url} alt="Foto publicada" className="aspect-square w-full object-cover"/>)}</div>}<time className="mt-3 block text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString("pt-BR")}</time></article>)}{posts.filter(post => post.user_id === userId).length === 0 && <p className="text-sm text-muted-foreground">Você ainda não publicou no Feed.</p>}</section>}
          </section>}

        </>}
      </div>
    </main></div>;
}
