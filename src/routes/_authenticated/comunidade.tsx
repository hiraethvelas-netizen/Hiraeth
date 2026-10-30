import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteLayout";
import { toast } from "sonner";
import { Flame, Heart, ImagePlus, MessageCircle, Send, Trash2, X, UserRound, BookOpen, Film, Tv } from "lucide-react";

type Tab = "chat" | "feed" | "perfil";
type MemberProfile = { username: string; avatar_url: string | null; instagram_url: string | null; tiktok_url: string | null; other_social_url: string | null; bio: string | null };
type Message = { id: string; user_id: string; body: string; created_at: string; is_admin?: boolean; community_profiles?: { username: string; avatar_url: string | null } | null };
type FeedPost = { id: string; user_id: string; body: string; image_urls: string[]; created_at: string; author: string; avatar_url: string | null; heartCount: number; fireCount: number; myReaction: "heart" | "fire" | null; commentCount: number };
type FeedComment = { id: string; post_id: string; user_id: string; body: string; created_at: string; author: string };

export const Route = createFileRoute("/_authenticated/comunidade")({
  head: () => ({ meta: [{ title: "Círculo do Fogo — Hiraeth" }] }),
  component: Comunidade,
});

function Comunidade() {
  const [userId, setUserId] = useState("");
  const [joined, setJoined] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
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
  const [interests, setInterests] = useState<{ id: string; interest_type: "book" | "movie" | "series" | "other"; title: string }[]>([]);
  const [interestTitle, setInterestTitle] = useState("");
  const [interestType, setInterestType] = useState<"book" | "movie" | "series" | "other">("book");
  const [avatarUploading, setAvatarUploading] = useState(false);

  async function loadInterests(currentUserId = userId) {
    const { data, error } = await (supabase as any).from("community_interests").select("id,interest_type,title").eq("user_id", currentUserId).order("created_at", { ascending: false });
    if (error) { toast.error("Não foi possível carregar seus interesses."); return; }
    setInterests((data ?? []) as typeof interests);
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
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
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
        await Promise.all([loadMessages(), loadFeed(data.user.id), loadInterests(data.user.id)]);
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
    const suggested = auth.user?.user_metadata?.display_name || auth.user?.email?.split("@")[0] || "integrante";
    const { error: profileError } = await (supabase as any).from("community_profiles").upsert({ user_id: userId, username: String(suggested).slice(0, 30) }, { onConflict: "user_id" });
    if (profileError) toast.error("Você entrou, mas ainda precisamos configurar seu perfil.");
    else setProfile(current => ({ ...current, username: String(suggested).slice(0, 30) }));
    setSaving(false);
    await Promise.all([loadMessages(), loadFeed(), loadInterests()]);
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
    const { data, error } = await (supabase as any).from("community_interests").insert({ user_id: userId, interest_type: interestType, title }).select("id,interest_type,title").single();
    if (error) toast.error("Não foi possível adicionar esse interesse."); else { setInterests(current => [data, ...current]); setInterestTitle(""); }
  }

  async function removeInterest(id: string) {
    const { error } = await (supabase as any).from("community_interests").delete().eq("id", id).eq("user_id", userId);
    if (error) toast.error("Não foi possível remover esse interesse."); else setInterests(current => current.filter(item => item.id !== id));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await (supabase as any).from("community_profiles").upsert({ user_id: userId, ...profile, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error("Não foi possível salvar seu perfil.");
    else toast.success("Perfil atualizado.");
  }

  const tabs: { id: Tab; label: string }[] = [{ id: "chat", label: "Chat" }, { id: "feed", label: "Feed" }, { id: "perfil", label: "Meu perfil" }];

  return <div className="min-h-screen bg-background"><SiteHeader />
    <main className="w-full px-0 pb-0 pt-16">
      <div className="min-h-[calc(100dvh-4rem)] w-full overflow-hidden border-y border-primary/25 bg-card">
        <div className="relative flex min-h-[300px] items-end overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_rgba(190,151,83,0.25),_transparent_45%),linear-gradient(125deg,#101b14,#263d2c_58%,#111b15)] px-6 py-10 md:min-h-[360px] md:px-14 md:py-14">
          <div className="relative max-w-3xl"><p className="text-xs uppercase tracking-[0.38em] text-[#d5bd82]">✦ Comunidade Hiraeth ✦</p><h1 className="mt-4 font-display text-5xl leading-none text-[#f5edda] md:text-7xl">Círculo do Fogo</h1><p className="mt-5 max-w-xl text-base leading-7 text-[#eee5d3]/85 md:text-lg">Histórias aproximam. Conversas acendem novas ideias. Encontre pessoas que sentem o mundo através dos livros, filmes e universos que amam.</p><p className="mt-7 text-xs uppercase tracking-[0.2em] text-[#d5bd82]">Um espaço para pertencer</p></div>
        </div>
        {loading ? <p className="p-8 text-muted-foreground">Carregando...</p> : !joined ? <section className="mx-auto max-w-4xl px-6 py-16 text-center md:py-24">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary"><Flame size={30}/></div><p className="eyebrow tracking-[0.3em]">Sua comunidade começa aqui</p><h2 className="mt-4 font-display text-4xl md:text-5xl">Sua próxima conexão começa aqui</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground">O Círculo do Fogo é o ponto de encontro de quem ama histórias. Converse, compartilhe suas descobertas, mostre o que está lendo e encontre pessoas que entendem os universos que fazem parte de você.</p>
          <button onClick={() => void joinCommunity()} disabled={saving} className="btn-gold mt-9 min-h-14 px-10 text-sm uppercase tracking-[0.16em] shadow-lg shadow-primary/10">{saving ? "Entrando..." : "Participar da comunidade"}</button>
        </section> : <>
          <nav className="sticky top-16 z-20 grid grid-cols-3 border-b border-primary/20 bg-card/95 shadow-sm backdrop-blur" aria-label="Áreas da comunidade">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`min-h-14 border-b-2 px-3 py-4 text-sm font-medium transition-colors md:min-h-16 md:text-base ${tab === item.id ? "border-primary bg-primary/5 text-primary" : "border-transparent text-muted-foreground hover:bg-primary/5"}`}>{item.label}</button>)}</nav>
          {tab === "chat" && <section className="flex h-[calc(100dvh-9.5rem)] min-h-[420px] flex-col bg-[#f4f0e7] dark:bg-[#172019]"><div className="flex items-center gap-3 border-b border-primary/15 bg-card px-4 py-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#20382b] text-[#e8d8b4]"><Flame size={20}/></div><div><h2 className="font-display text-lg">Conversa ao redor da chama</h2><p className="text-[11px] text-muted-foreground">Chat do Círculo do Fogo</p></div></div><div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_20%_20%,rgba(179,148,91,0.08),transparent_30%)] px-3 py-5 md:px-8">{messages.map(message => <article key={message.id} className={`max-w-[90%] rounded-md border p-3 ${message.is_admin ? "border-emerald-700/40 bg-emerald-50/70" : message.user_id === userId ? "ml-auto border-primary/30 bg-primary/5" : "border-border bg-card"}`}><p className={`mb-1 text-xs font-semibold ${message.is_admin ? "text-emerald-700" : "text-primary"}`}>{message.is_admin ? "Hiraeth — Mari" : message.community_profiles?.username || "Integrante"}</p><p className="whitespace-pre-wrap text-sm">{message.body}</p><time className="mt-2 block text-right text-[10px] text-muted-foreground">{new Date(message.created_at).toLocaleString("pt-BR")}</time></article>)}{messages.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">A conversa começa com você. Deixe a primeira mensagem!</p>}</div><form onSubmit={sendMessage} className="sticky bottom-0 flex items-center gap-2 border-t border-primary/15 bg-card px-3 py-3 md:px-6"><input value={body} onChange={e => setBody(e.target.value)} maxLength={3000} placeholder="Digite uma mensagem..." className="min-w-0 flex-1 rounded-full border border-primary/20 bg-background px-4 py-3 text-sm outline-none focus:border-primary" /><button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#20382b] text-[#f5edda]" type="submit" aria-label="Enviar mensagem"><Send size={18}/></button></form></section>}
          {tab === "feed" && <section className="min-h-[calc(100dvh-9.5rem)] space-y-5 px-0 pb-8"><details className="group border-b border-primary/15 bg-background"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 md:px-8"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#20382b] text-[#e8d8b4]"><ImagePlus size={20}/></span><span className="min-w-0 flex-1"><strong className="block text-sm font-medium">Faça sua primeira publicação</strong><span className="text-xs text-muted-foreground">Compartilhe uma leitura, foto ou pensamento...</span></span><span className="rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">Criar post</span></summary><form onSubmit={publishPost} className="mx-auto max-w-3xl space-y-3 border-t border-primary/10 p-4 md:p-6">
              <textarea value={postBody} onChange={e => setPostBody(e.target.value)} maxLength={5000} rows={4} placeholder="O que está passando pela sua cabeça?" className="w-full resize-y border border-primary/20 bg-card p-3 text-sm outline-none focus:border-primary" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ImagePlus size={18}/> Adicionar fotos e vídeos<input id="community-post-images" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple className="sr-only" onChange={e => setPostFiles(Array.from(e.target.files ?? []).slice(0, 4))}/></label>
                <button type="submit" disabled={posting} className="btn-gold inline-flex items-center gap-2">{posting ? "Publicando..." : "Publicar"} <Send size={15}/></button>
              </div>
              {postFiles.length > 0 && <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{postFiles.length} foto(s) selecionada(s): {postFiles.map(file => file.name).join(", ")}</span><button type="button" onClick={() => { setPostFiles([]); const el = document.getElementById("community-post-images") as HTMLInputElement | null; if (el) el.value = ""; }} aria-label="Remover fotos selecionadas"><X size={15}/></button></div>}
              <p className="text-[11px] text-muted-foreground">Até 4 fotos ou vídeos por publicação. O envio de vídeos depende dos limites do armazenamento.</p>
            </form></details><div className="mx-auto w-full max-w-3xl space-y-5 px-3 md:px-6">
            {posts.length === 0 ? <div className="border border-dashed border-primary/30 px-5 py-12 text-center"><Flame className="mx-auto text-primary" size={30}/><p className="mt-3 font-display text-xl">A primeira chama do Feed pode ser sua</p><p className="mt-1 text-sm text-muted-foreground">Compartilhe uma foto ou escreva algo para começar.</p></div> : posts.map(post => <article key={post.id} className="overflow-hidden border border-primary/20 bg-background/60">
              <div className="flex items-start gap-3 p-4">
                {post.avatar_url ? <img src={post.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#20382b] text-[#e8d8b4]">{post.author.slice(0,1).toUpperCase()}</div>}
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{post.author}</p><time className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString("pt-BR")}</time></div>
                {post.user_id === userId && <button type="button" onClick={() => void deletePost(post)} aria-label="Excluir publicação" className="rounded p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16}/></button>}
              </div>
              {post.body && <p className="whitespace-pre-wrap px-4 pb-4 text-sm leading-relaxed">{post.body}</p>}
              {post.image_urls?.length > 0 && <div className={`grid gap-1 ${post.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{post.image_urls.map(url => <img key={url} src={url} alt="Foto compartilhada no Círculo do Fogo" loading="lazy" className={`w-full object-cover ${post.image_urls.length === 1 ? "max-h-[560px]" : "aspect-square"}`}/>)}</div>}
              <div className="flex flex-wrap items-center gap-2 border-t border-primary/10 px-3 py-3">
                <button type="button" disabled={reacting === post.id} onClick={() => void reactToPost(post, "heart")} aria-pressed={post.myReaction === "heart"} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors ${post.myReaction === "heart" ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-transparent text-muted-foreground hover:bg-emerald-50 hover:text-emerald-800"}`}><Heart size={18} fill={post.myReaction === "heart" ? "currentColor" : "none"}/> <span>{post.heartCount}</span><span className="sr-only">corações verdes</span></button>
                <button type="button" disabled={reacting === post.id} onClick={() => void reactToPost(post, "fire")} aria-pressed={post.myReaction === "fire"} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors ${post.myReaction === "fire" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-transparent text-muted-foreground hover:bg-orange-50 hover:text-orange-700"}`}><Flame size={19} fill={post.myReaction === "fire" ? "currentColor" : "none"}/> <span>{post.fireCount}</span><span className="sr-only">foguinhos</span></button>
                <button type="button" onClick={() => void toggleComments(post.id)} className="ml-auto inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-primary/5 hover:text-primary"><MessageCircle size={17}/> {post.commentCount} comentários</button>
              </div>
              {openComments === post.id && <div className="space-y-3 border-t border-primary/10 bg-card/40 p-4">
                {(comments[post.id] ?? []).map(comment => <div key={comment.id} className="text-sm"><span className="font-semibold text-primary">{comment.author}</span><p className="mt-0.5 whitespace-pre-wrap">{comment.body}</p><time className="text-[10px] text-muted-foreground">{new Date(comment.created_at).toLocaleString("pt-BR")}</time></div>)}
                {(comments[post.id] ?? []).length === 0 && <p className="text-xs text-muted-foreground">Seja a primeira pessoa a comentar.</p>}
                <form onSubmit={e => void addComment(e, post.id)} className="flex gap-2"><input value={commentDrafts[post.id] ?? ""} onChange={e => setCommentDrafts(current => ({ ...current, [post.id]: e.target.value }))} maxLength={2000} placeholder="Escreva um comentário..." className="min-w-0 flex-1 border bg-background px-3 py-2 text-sm"/><button type="submit" aria-label="Enviar comentário" className="btn-gold px-3"><Send size={16}/></button></form>
              </div>}
            </article>)}
          </div></section>}
          {tab === "perfil" && <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-7 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:px-8 md:py-10"><form onSubmit={saveProfile} className="grid gap-4"><div><p className="eyebrow">Sua presença</p><h2 className="mt-1 font-display text-3xl">Meu perfil</h2><p className="mt-2 text-sm text-muted-foreground">Mostre à comunidade quem você é.</p></div><div className="flex items-center gap-4"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-[#20382b] text-[#e8d8b4]">{profile.avatar_url ? <img src={profile.avatar_url} alt="Sua foto de perfil" className="h-full w-full object-cover"/> : <UserRound size={34}/>}</div><label className="cursor-pointer text-sm text-primary underline">{avatarUploading ? "Enviando foto..." : "Alterar foto de perfil"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={avatarUploading} onChange={e => void uploadAvatar(e.target.files?.[0])}/></label></div><label className="grid gap-2 text-sm">Nome de usuário<input required maxLength={30} value={profile.username} onChange={e => setProfile({ ...profile, username: e.target.value })} className="border bg-transparent p-3" /></label><label className="grid gap-2 text-sm">Sobre mim<textarea maxLength={500} value={profile.bio ?? ""} onChange={e => setProfile({ ...profile, bio: e.target.value })} className="border bg-transparent p-3" rows={3} /></label><label className="grid gap-2 text-sm">Instagram<input value={profile.instagram_url ?? ""} onChange={e => setProfile({ ...profile, instagram_url: e.target.value })} className="border bg-transparent p-3" placeholder="https://instagram.com/..." /></label><label className="grid gap-2 text-sm">TikTok<input value={profile.tiktok_url ?? ""} onChange={e => setProfile({ ...profile, tiktok_url: e.target.value })} className="border bg-transparent p-3" placeholder="https://tiktok.com/@..." /></label><label className="grid gap-2 text-sm">Outra rede social<input value={profile.other_social_url ?? ""} onChange={e => setProfile({ ...profile, other_social_url: e.target.value })} className="border bg-transparent p-3" /></label><button disabled={saving} className="btn-gold justify-self-start">Salvar perfil</button></form><section className="rounded-xl border border-primary/20 bg-background/60 p-5 md:p-7"><p className="eyebrow">Livros, telas e paixões</p><h3 className="mt-1 font-display text-3xl">Meu Universo</h3><p className="mt-1 text-sm text-muted-foreground">Conte à comunidade quais livros, filmes e séries fazem parte do seu mundo.</p><form onSubmit={addInterest} className="mt-4 flex flex-wrap gap-2"><select value={interestType} onChange={e => setInterestType(e.target.value as typeof interestType)} className="border bg-background px-3 py-2 text-sm"><option value="book">Livro</option><option value="movie">Filme</option><option value="series">Série</option><option value="other">Outro</option></select><input value={interestTitle} onChange={e => setInterestTitle(e.target.value)} maxLength={160} placeholder="Nome do livro, filme ou série" className="min-w-0 flex-1 border bg-background px-3 py-2 text-sm"/><button type="submit" className="btn-gold">Adicionar</button></form><div className="mt-4 flex flex-wrap gap-2">{interests.map(item => <span key={item.id} className="inline-flex items-center gap-2 rounded-full border border-primary/25 px-3 py-2 text-sm">{item.interest_type === "book" ? <BookOpen size={14}/> : item.interest_type === "movie" ? <Film size={14}/> : item.interest_type === "series" ? <Tv size={14}/> : <Flame size={14}/>} {item.title}<button type="button" onClick={() => void removeInterest(item.id)} aria-label={`Remover ${item.title}`} className="text-muted-foreground hover:text-destructive"><X size={14}/></button></span>)}</div>{interests.length === 0 && <p className="mt-3 text-xs text-muted-foreground">Seus interesses aparecerão aqui conforme você os adicionar.</p>}</section></div>}
        </>}
      </div>
    </main></div>;
}
