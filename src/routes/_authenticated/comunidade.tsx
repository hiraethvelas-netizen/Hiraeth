import { HouseBadge } from "@/components/HouseBadge";
import { HouseChoiceCards } from "@/components/HouseChoiceCards";
import { HouseCup } from "@/components/HouseCup";
import { MagicPolls } from "@/components/MagicPolls";
import { HOUSE_CHANGED_EVENT, type HouseId } from "@/lib/house-cup";
import { useLibraryCategories } from "@/hooks/use-library-categories";
// Chat do Círculo do Fogo: interface leve, com ações por mensagem e permissões do autor.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteLayout";
import { CommunityStorySpotlight } from "@/components/CommunityStorySpotlight";
import { getCommunityMessageIdentity } from "@/lib/community-message-identity";
import { getMessageReactionOperation } from "@/lib/community-message-reactions";
import { CandleBookshelf, type CandleDraftInput, type CandleLibraryItem } from "@/components/CandleBookshelf";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Flame, Heart, ImagePlus, MessageCircle, Send, Trash2, X, UserRound, BookOpen, Film, Tv, MoreVertical } from "lucide-react";

type Tab = "inicio" | "chat" | "feed" | "perfil";
type MemberProfile = { username: string; avatar_url: string | null; instagram_url: string | null; tiktok_url: string | null; other_social_url: string | null; bio: string | null; library_visible: boolean };
type Message = { id: string; user_id: string; body: string; created_at: string; edited_at?: string | null; is_pinned?: boolean; is_admin?: boolean; myReaction?: "heart" | "fire" | null; heartCount?: number; fireCount?: number; community_profiles?: { username: string; avatar_url: string | null } | null };
type FeedPost = { id: string; user_id: string; body: string; image_urls: string[]; created_at: string; author: string; avatar_url: string | null; is_admin?: boolean; heartCount: number; fireCount: number; myReaction: "heart" | "fire" | null; commentCount: number };
type FeedComment = { id: string; post_id: string; user_id: string; body: string; created_at: string; author: string };
type PublicMember = MemberProfile & { user_id: string };
type LibraryCandle = CandleLibraryItem;
type CommunityInterest = { id: string; interest_type: "book" | "movie" | "series" | "other"; title: string; image_url?: string | null };

function InterestBookshelf({ items, onSelect }: { items: CommunityInterest[]; onSelect?: (item: CommunityInterest) => void }) {
  const [filter, setFilter] = useState<"all" | "movie" | "series" | "book" | "other">("all");
  const visible = filter === "all" ? items : items.filter(item => item.interest_type === filter);
  const filters = [{ id: "all", label: "Todos" }, { id: "book", label: "Livros" }, { id: "movie", label: "Filmes" }, { id: "series", label: "Séries" }, { id: "other", label: "Outros" }] as const;
  return <div className="rounded-2xl border border-[#9e956f]/35 bg-[#17251d] p-3 text-[#f7efda] shadow-sm sm:p-5">
    <div className="mb-5 flex flex-wrap gap-2">{filters.map(item => <button key={item.id} type="button"
      onClick={() => setFilter(item.id)}
      className={"rounded-full border px-3 py-2 text-xs font-semibold transition-colors " +
        (filter === item.id ? "border-[#d2bc80] bg-[#d2bc80] text-[#1f2d23]" : "border-[#d2bc80]/40 text-[#f7efda] hover:bg-white/10")}>
      {item.label}</button>)}</div>
    {visible.length === 0 ? <p className="py-10 text-center text-sm text-[#e4decf]">Este universo ainda está sendo construído.</p> :
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map(item => <article key={item.id} role={onSelect ? "button" : undefined}
          tabIndex={onSelect ? 0 : undefined}
          onClick={() => onSelect?.(item)}
          onKeyDown={event => { if (onSelect && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(item); } }}
          aria-label={onSelect ? `Editar ou remover ${item.title}` : undefined}
          className={"min-w-0 rounded-md outline-none " + (onSelect ? "cursor-pointer transition-transform hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#d2bc80]" : "")}>
          <div className="aspect-[2/3] w-full overflow-hidden rounded-md border border-[#947e58]/70 bg-[#304030] shadow-[0_8px_18px_rgba(0,0,0,.3)]">
            {item.image_url ? <img loading="lazy" src={item.image_url} alt={"Capa de " + item.title} className="h-full w-full object-cover" /> :
              <div className="flex h-full items-center justify-center bg-[linear-gradient(150deg,#455d43,#1d3128)] px-3 text-center font-display text-base leading-snug text-[#f7efda]">{item.title}</div>}
          </div>
          <p className="mt-2 line-clamp-2 min-h-10 text-center text-xs font-medium leading-5 text-[#f7efda] sm:text-sm">{item.title}</p>
        </article>)}
      </div>}
  </div>;
}

export const Route = createFileRoute("/_authenticated/comunidade")({
  head: () => ({ meta: [{ title: "Círculo do Fogo — Hiraeth" }] }),
  component: Comunidade,
});

function Comunidade() {
  const categoryOptions = useLibraryCategories();
  const [userId, setUserId] = useState("");
  const [memberHouses, setMemberHouses] = useState<Record<string, HouseId | null>>({});
  const [houseSaving, setHouseSaving] = useState(false);
  const [joined, setJoined] = useState(false);
  const [tab, setTab] = useState<Tab>(() => {
    // Links from Sinais da Chama open the relevant area of the community.
    const requested = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("tab");
    return requested === "chat" || requested === "feed" ? requested : "inicio";
  });
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageBody, setEditingMessageBody] = useState("");
  const [body, setBody] = useState("");
  const [profile, setProfile] = useState<MemberProfile>({ username: "", avatar_url: null, instagram_url: null, tiktok_url: null, other_social_url: null, bio: null, library_visible: true });
  const [saving, setSaving] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postBody, setPostBody] = useState("");
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [reacting, setReacting] = useState<string | null>(null);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [interests, setInterests] = useState<CommunityInterest[]>([]);
  const [selectedInterest, setSelectedInterest] = useState<CommunityInterest | null>(null);
  const [editingInterestTitle, setEditingInterestTitle] = useState("");
  const [editingInterestType, setEditingInterestType] = useState<CommunityInterest["interest_type"]>("book");
  const [editingInterestCover, setEditingInterestCover] = useState<File | null>(null);
  const [interestTitle, setInterestTitle] = useState("");
  const [interestType, setInterestType] = useState<"book" | "movie" | "series" | "other">("book");
  const [interestCover, setInterestCover] = useState<File | null>(null);
  const [interestUploading, setInterestUploading] = useState(false);
  const [publicMember, setPublicMember] = useState<PublicMember | null>(null);
  const [publicProfileLoading, setPublicProfileLoading] = useState(false);
  const [library, setLibrary] = useState<LibraryCandle[]>([]);
  const [profileSection, setProfileSection] = useState<"info" | "universe" | "library" | "posts">("info");
  const [publicSection, setPublicSection] = useState<"profile" | "universe" | "library" | "posts">("profile");
  const [publicInterests, setPublicInterests] = useState<CommunityInterest[]>([]);
  const [publicLibrary, setPublicLibrary] = useState<LibraryCandle[]>([]);
  const [avatarUploading, setAvatarUploading] = useState(false);

  async function loadMemberHouses(userIds: string[]) {
    const ids = [...new Set(userIds.filter(Boolean))].slice(0, 200);
    if (!ids.length) return;
    const { data, error } = await (supabase as any).rpc("get_member_houses", { p_user_ids: ids });
    if (error) { console.warn("Os selos das casas não puderam ser carregados.", error); return; }
    setMemberHouses(current => ({
      ...current,
      ...Object.fromEntries(ids.map(id => [id, null])),
      ...Object.fromEntries((data ?? []).map((entry: { user_id: string; house: HouseId }) => [entry.user_id, entry.house])),
    }));
  }

  async function loadInterests(currentUserId = userId) {
    const { data, error } = await (supabase as any).from("community_interests").select("id,interest_type,title,image_url").eq("user_id", currentUserId).order("created_at", { ascending: true });
    if (error) { toast.error("Não foi possível carregar seus interesses."); return; }
    setInterests((data ?? []) as typeof interests);
  }

  async function loadLibrary(currentUserId = userId) {
    const { data, error } = await (supabase as any).from("community_library").select("*").eq("user_id", currentUserId).order("created_at", { ascending: false });
    if (error) { toast.error("Não foi possível carregar sua biblioteca Hiraeth."); return; }
    setLibrary((data ?? []) as LibraryCandle[]);
  }

  async function loadMessages(currentUserId = userId) {
    const { data, error } = await (supabase as any).from("community_messages")
      .select("id,user_id,body,created_at,edited_at,is_pinned")
      .order("created_at", { ascending: true }).limit(150);
    if (error) {
      console.error("Erro ao carregar mensagens do Círculo do Fogo:", error);
      toast.error("Não foi possível carregar o histórico do chat. Tente atualizar a página.");
      return;
    }
    const rows = (data ?? []) as Message[];
    if (!rows.length) { setMessages([]); return; }
    const ids: string[] = [...new Set<string>(rows.map((message: Message) => message.user_id))];
    void loadMemberHouses(ids);
    const messageIds = rows.map(message => message.id);
    const [{ data: profiles, error: profilesError }, { data: reactions, error: reactionsError }, roles] = await Promise.all([
      (supabase as any).from("community_profiles").select("user_id,username,avatar_url").in("user_id", ids),
      (supabase as any).from("community_message_reactions").select("message_id,user_id,reaction_type").in("message_id", messageIds),
      Promise.all(ids.map(async id => {
        const { data: admin } = await supabase.rpc("has_role", { _user_id: id, _role: "admin" });
        return [id, admin === true] as const;
      })),
    ]);
    if (profilesError) console.warn("Perfis do chat não carregaram:", profilesError);
    if (reactionsError) console.warn("Reações do chat não carregaram:", reactionsError);
    const profileMap = new Map<string, any>((profiles ?? []).map((profile: any) => [profile.user_id, profile]));
    const adminMap = new Map(roles);
    setMessages(rows.map(message => {
      const messageReactions = (reactions ?? []).filter((reaction: any) => reaction.message_id === message.id);
      const own = messageReactions.find((reaction: any) => reaction.user_id === currentUserId);
      return {
        ...message,
        community_profiles: profileMap.get(message.user_id) ?? null,
        is_admin: adminMap.get(message.user_id) === true,
        myReaction: own?.reaction_type ?? null,
        heartCount: messageReactions.filter((reaction: any) => reaction.reaction_type === "heart").length,
        fireCount: messageReactions.filter((reaction: any) => reaction.reaction_type === "fire").length,
      };
    }));
  }

  async function loadFeed(currentUserId = userId) {
    const { data: postRows, error } = await (supabase as any).from("community_posts").select("id,user_id,body,image_urls,created_at").order("created_at", { ascending: false }).limit(60);
    if (error) { toast.error("Não foi possível carregar o Feed."); return; }
    const rows = postRows ?? [];
    if (!rows.length) { setPosts([]); return; }
    const ids = rows.map((p: any) => p.id);
    const users: string[] = [...new Set<string>(rows.map((p: any) => String(p.user_id)))];
    void loadMemberHouses(users);
    const [{ data: profiles }, { data: reactions }, { data: commentRows }] = await Promise.all([
      (supabase as any).from("community_profiles").select("user_id,username,avatar_url").in("user_id", users),
      (supabase as any).from("community_post_reactions").select("post_id,user_id,reaction_type").in("post_id", ids),
      (supabase as any).from("community_post_comments").select("post_id").in("post_id", ids),
    ]);
    const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id, p]));
    const adminRoles = await Promise.all(users.map(async (id: string) => { const { data: admin } = await supabase.rpc("has_role", { _user_id: id, _role: "admin" }); return [id, admin === true] as const; }));
    const adminMap = new Map(adminRoles);
    setPosts(rows.map((p: any) => {
      const postReactions = (reactions ?? []).filter((r: any) => r.post_id === p.id);
      const own = postReactions.find((r: any) => r.user_id === currentUserId);
      return {
        ...p,
        author: profileMap.get(p.user_id)?.username || "Integrante",
        avatar_url: profileMap.get(p.user_id)?.avatar_url || null,
        is_admin: adminMap.get(p.user_id) === true,
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
      const { data: currentAdmin } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      setIsAdmin(currentAdmin === true);
      const { data: membership } = await (supabase as any).from("community_memberships").select("user_id").eq("user_id", data.user.id).maybeSingle();
      if (membership) {
        setJoined(true);
        void loadMemberHouses([data.user.id]);
        const { data: p } = await (supabase as any).from("community_profiles").select("*").eq("user_id", data.user.id).maybeSingle();
        if (p) setProfile(p);
        await Promise.all([loadMessages(data.user.id), loadFeed(data.user.id), loadInterests(data.user.id), loadLibrary(data.user.id)]);
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
    void loadMemberHouses([userId]);
    const { data: auth } = await supabase.auth.getUser();
    const suggested = auth.user?.user_metadata?.["display_name"] || auth.user?.email?.split("@")[0] || "integrante";
    const { error: profileError } = await (supabase as any).from("community_profiles").upsert({ user_id: userId, username: String(suggested).slice(0, 30) }, { onConflict: "user_id" });
    if (profileError) toast.error("Você entrou, mas ainda precisamos configurar seu perfil.");
    else setProfile(current => ({ ...current, username: String(suggested).slice(0, 30), library_visible: true }));
    setSaving(false);
    await Promise.all([loadMessages(userId), loadFeed(), loadInterests(), loadLibrary()]);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !userId) return;
    const { data: saved, error } = await (supabase as any).from("community_messages")
      .insert({ user_id: userId, body: text })
      .select("id,user_id,body,created_at,edited_at,is_pinned")
      .single();
    if (error) {
      console.error("Erro ao salvar mensagem do chat:", error);
      toast.error(error.message || "Não foi possível salvar sua mensagem. Verifique sua participação na comunidade.");
      return;
    }
    setBody("");
    const { data: ownProfile } = await (supabase as any).from("community_profiles")
      .select("user_id,username,avatar_url").eq("user_id", userId).maybeSingle();
    setMessages(current => current.some(message => message.id === saved.id) ? current : [...current, {
      ...saved,
      community_profiles: ownProfile ?? null,
      is_admin: isAdmin,
      myReaction: null,
      heartCount: 0,
      fireCount: 0,
    }]);
    await loadMessages(userId);
  }

  async function saveMessageEdit(message: Message) {
    const text = editingMessageBody.trim();
    if (!text || text.length > 3000) return;
    const { error } = await (supabase as any).from("community_messages").update({ body: text, edited_at: new Date().toISOString() }).eq("id", message.id);
    if (error) toast.error("Não foi possível editar a mensagem.");
    else { setEditingMessageId(null); setEditingMessageBody(""); await loadMessages(); }
  }

  async function deleteMessage(message: Message) {
    if (message.user_id !== userId || !window.confirm("Deseja apagar esta mensagem?")) return;
    const { error } = await (supabase as any).from("community_messages").delete().eq("id", message.id);
    if (error) toast.error("Não foi possível apagar a mensagem."); else await loadMessages();
  }

  async function togglePinMessage(message: Message) {
    if (!isAdmin) return;
    const { error } = await (supabase as any).from("community_messages").update({ is_pinned: !message.is_pinned }).eq("id", message.id);
    if (error) toast.error("Não foi possível fixar a mensagem."); else await loadMessages();
  }

  async function reactToMessage(message: Message, type: "heart" | "fire") {
    if (!userId || reactingMessageId) return;
    setReactingMessageId(message.id);
    const operation = getMessageReactionOperation(message.myReaction ?? null, type);
    try {
      const reactionsTable = (supabase as any).from("community_message_reactions");
      if (operation === "delete") {
        const { data, error } = await reactionsTable
          .delete()
          .eq("message_id", message.id)
          .eq("user_id", userId)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("A reação anterior não foi localizada. Atualize o chat e tente novamente.");
      } else {
        // The unique key (message_id, user_id) makes this safe for both first reactions and changes.
        const { data, error } = await reactionsTable
          .upsert({ message_id: message.id, user_id: userId, reaction_type: type }, { onConflict: "message_id,user_id" })
          .select("id")
          .single();
        if (error) throw error;
        if (!data) throw new Error("O servidor não confirmou o salvamento da reação.");
      }

      setMessages(current => current.map(item => {
        if (item.id !== message.id) return item;
        const nextReaction = operation === "delete" ? null : type;
        let heartCount = item.heartCount ?? 0;
        let fireCount = item.fireCount ?? 0;
        if (item.myReaction === "heart") heartCount = Math.max(0, heartCount - 1);
        if (item.myReaction === "fire") fireCount = Math.max(0, fireCount - 1);
        if (nextReaction === "heart") heartCount += 1;
        if (nextReaction === "fire") fireCount += 1;
        return { ...item, myReaction: nextReaction, heartCount, fireCount };
      }));
      toast.success(operation === "delete" ? "Reação removida." : "Reação registrada.");
      await loadMessages(userId);
    } catch (error) {
      console.error("Erro ao reagir à mensagem do chat:", error);
      const detail = error instanceof Error ? error.message : "Erro inesperado ao salvar a reação.";
      toast.error("Não foi possível registrar sua reação.", { description: detail });
    } finally {
      setReactingMessageId(null);
    }
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
    void loadMemberHouses(userIds as string[]);
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
    if (!(post.user_id === userId || isAdmin) || !window.confirm("Deseja excluir esta publicação?")) return;
    const query = (supabase as any).from("community_posts").delete().eq("id", post.id);
    const { error } = await (post.user_id === userId ? query.eq("user_id", userId) : query);
    if (error) toast.error("Não foi possível excluir a publicação.");
    else { toast.success("Publicação excluída."); await loadFeed(); }
  }

  async function editPost(post: FeedPost) {
    const updated = window.prompt("Edite o texto da publicação:", post.body);
    if (updated === null) return;
    const { error } = await (supabase as any).from("community_posts").update({ body: updated.trim(), updated_at: new Date().toISOString() }).eq("id", post.id);
    if (error) toast.error("Não foi possível editar a publicação."); else { toast.success("Publicação atualizada."); await loadFeed(); }
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
      setInterests(current => [...current, data]); setInterestTitle(""); setInterestCover(null);
      const picker = document.getElementById("community-interest-cover") as HTMLInputElement | null; if (picker) picker.value = "";
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível adicionar esse interesse."); }
    finally { setInterestUploading(false); }
  }

  async function saveInterestEdit() {
    if (!selectedInterest) return;
    const title = editingInterestTitle.trim();
    if (!title) { toast.error("Informe um nome para este interesse."); return; }
    setInterestUploading(true);
    try {
      let image_url = selectedInterest.image_url ?? null;
      if (editingInterestCover) {
        if (!editingInterestCover.type.startsWith("image/") || editingInterestCover.size > 8 * 1024 * 1024) throw new Error("Escolha uma capa de até 8 MB.");
        const ext = editingInterestCover.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
        const path = "public/universe-" + userId + "-" + crypto.randomUUID() + "." + ext;
        const { error: uploadError } = await supabase.storage.from("review-media").upload(path, editingInterestCover, { contentType: editingInterestCover.type, upsert: false });
        if (uploadError) throw uploadError;
        image_url = supabase.storage.from("review-media").getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await (supabase as any).from("community_interests")
        .update({ title, interest_type: editingInterestType, image_url })
        .eq("id", selectedInterest.id).eq("user_id", userId)
        .select("id,interest_type,title,image_url").single();
      if (error) throw error;
      setInterests(current => current.map(item => item.id === selectedInterest.id ? data as CommunityInterest : item));
      setSelectedInterest(null);
      setEditingInterestCover(null);
      toast.success("Interesse atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar esse interesse.");
    } finally {
      setInterestUploading(false);
    }
  }

  async function removeSelectedInterest() {
    if (!selectedInterest || !window.confirm(`Deseja remover “${selectedInterest.title}” do seu universo?`)) return;
    setInterestUploading(true);
    try {
      const { data, error } = await (supabase as any).from("community_interests")
        .delete().eq("id", selectedInterest.id).eq("user_id", userId).select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Este interesse não foi encontrado para remoção.");
      setInterests(current => current.filter(item => item.id !== selectedInterest.id));
      setSelectedInterest(null);
      setEditingInterestCover(null);
      toast.success("Interesse removido.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover esse interesse.");
    } finally {
      setInterestUploading(false);
    }
  }

  async function uploadLibraryImage(file: File | null) {
    if (!file) return null;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) throw new Error("Escolha uma foto de até 8 MB.");
    const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const path = "public/library-" + userId + "-" + crypto.randomUUID() + "." + ext;
    const { error: uploadError } = await supabase.storage.from("review-media").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    return supabase.storage.from("review-media").getPublicUrl(path).data.publicUrl;
  }

  async function addLibraryCandle(values: CandleDraftInput) {
    if (!userId) throw new Error("Entre na sua conta para adicionar uma vela.");
    if (!values.image) throw new Error("Adicione uma foto da vela para registrar sua coleção antiga.");
    const { data: purchaseMatches, error: duplicateError } = await (supabase as any).from("community_library")
      .select("id,acquired_at")
      .eq("user_id", userId)
      .ilike("title", values.title.trim())
      .not("order_item_id", "is", null)
      .limit(20);
    if (duplicateError) throw duplicateError;
    const duplicatePurchase = (purchaseMatches ?? []).some((purchase: { acquired_at: string | null }) => !values.acquired_at || purchase.acquired_at === values.acquired_at);
    if (duplicatePurchase) throw new Error("Essa vela já aparece na sua Biblioteca por uma compra da loja. Abra o registro existente para completar seus detalhes após a entrega.");
    const image_url = await uploadLibraryImage(values.image);
    const { data, error } = await (supabase as any).from("community_library").insert({
      user_id: userId,
      title: values.title,
      aroma: values.aroma.trim() || null,
      image_url,
      category: values.category.trim() || null,
      notes: values.notes.trim() || null,
      acquired_at: values.acquired_at || null,
      rating: values.rating || null,
    }).select("*").single();
    if (error) throw error;
    setLibrary(current => [data as LibraryCandle, ...current]);
    toast.success("Vela adicionada à sua biblioteca!");
  }

  async function updateLibraryCandle(id: string, values: CandleDraftInput) {
    if (!userId) throw new Error("Entre na sua conta para editar esta vela.");
    const current = library.find(item => item.id === id);
    if (!current) throw new Error("Esta vela não foi encontrada.");
    if (current.order_item_id && current.purchase_status !== "delivered") {
      throw new Error("Os detalhes e os foguinhos ficam disponíveis quando o pedido for marcado como entregue.");
    }
    const image_url = current.order_item_id ? null : await uploadLibraryImage(values.image);
    const payload = current.order_item_id
      ? {
          notes: values.notes.trim() || null,
          rating: values.rating || null,
          updated_at: new Date().toISOString(),
        }
      : {
          title: values.title,
          aroma: values.aroma.trim() || null,
          category: values.category.trim() || null,
          acquired_at: values.acquired_at || null,
          notes: values.notes.trim() || null,
          rating: values.rating || null,
          ...(image_url ? { image_url } : {}),
          updated_at: new Date().toISOString(),
        };
    const { data, error } = await (supabase as any).from("community_library").update(payload).eq("id", id).eq("user_id", userId).select("*").single();
    if (error) throw error;
    setLibrary(currentItems => currentItems.map(item => item.id === id ? data as LibraryCandle : item));
    toast.success("Detalhes da vela atualizados.");
  }

  async function toggleLibraryFavorite(item: LibraryCandle) {
    const { error } = await (supabase as any).from("community_library").update({ favorite: !item.favorite }).eq("id", item.id).eq("user_id", userId);
    if (error) throw error;
    await loadLibrary();
  }

  async function toggleLibraryFinished(item: LibraryCandle, finished: boolean) {
    if (item.order_item_id && item.purchase_status !== "delivered") throw new Error("Você poderá marcar esta vela depois que o pedido for entregue.");
    const { data, error } = await (supabase as any).from("community_library").update({ finished, updated_at: new Date().toISOString() }).eq("id", item.id).eq("user_id", userId).select("id,finished").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Não foi possível confirmar a atualização desta vela. Atualize a biblioteca e tente novamente.");
    setLibrary(current => current.map(entry => entry.id === item.id ? { ...entry, finished: data.finished === true } : entry));
    toast.success(finished ? "Vela movida para Acabaram." : "Vela voltou para a estante.");
  }

  async function removeLibraryCandle(id: string) {
    const { data, error } = await (supabase as any).from("community_library")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .is("order_item_id", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Esta vela não pode ser removida.");
    setLibrary(current => current.filter(item => item.id !== id));
  }

  async function openPublicProfile(memberId: string) {
    if (!memberId) { toast.error("Não foi possível identificar este integrante."); return; }
    if (memberId === userId) { setPublicMember(null); setTab("perfil"); setProfileSection("info"); return; }

    void loadMemberHouses([memberId]);
    const cachedPost = posts.find(post => post.user_id === memberId);
    const cachedMessage = messages.find(message => message.user_id === memberId);
    const fallbackProfile: PublicMember = {
      user_id: memberId,
      username: cachedPost?.author || cachedMessage?.community_profiles?.username || "Integrante",
      avatar_url: cachedPost?.avatar_url ?? cachedMessage?.community_profiles?.avatar_url ?? null,
      bio: null,
      instagram_url: null,
      tiktok_url: null,
      other_social_url: null,
      library_visible: true,
    };
    setPublicMember(fallbackProfile);
    setPublicSection("profile");
    setPublicProfileLoading(true);
    setPublicInterests([]);
    setPublicLibrary([]);

    try {
      let profileData: any = null;
      const profileResult = await (supabase as any).from("community_profiles")
        .select("user_id,username,avatar_url,bio,instagram_url,tiktok_url,other_social_url,library_visible")
        .eq("user_id", memberId).maybeSingle();
      if (profileResult.error) {
        // Compatibilidade com a implantação anterior à coluna opcional de privacidade da estante.
        console.warn("Perfil público: tentando leitura compatível com o esquema anterior.", profileResult.error);
        const legacyResult = await (supabase as any).from("community_profiles")
          .select("user_id,username,avatar_url,bio,instagram_url,tiktok_url,other_social_url")
          .eq("user_id", memberId).maybeSingle();
        if (legacyResult.error) console.warn("Não foi possível carregar os detalhes adicionais do perfil.", legacyResult.error);
        else profileData = legacyResult.data;
      } else {
        profileData = profileResult.data;
      }

      const resolvedProfile: PublicMember = profileData
        ? { ...fallbackProfile, ...profileData, library_visible: profileData.library_visible !== false }
        : fallbackProfile;
      setPublicMember(resolvedProfile);

      const canViewLibrary = resolvedProfile.library_visible !== false;
      const [interestsResult, libraryResult] = await Promise.all([
        (supabase as any).from("community_interests").select("id,interest_type,title,image_url").eq("user_id", memberId).order("created_at", { ascending: true }),
        canViewLibrary
          ? (supabase as any).from("community_library").select("*").eq("user_id", memberId).order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (interestsResult.error) console.warn("Interesses do perfil não puderam ser carregados.", interestsResult.error);
      if (libraryResult.error) console.warn("Biblioteca do perfil não pôde ser carregada.", libraryResult.error);
      setPublicInterests((interestsResult.data ?? []) as typeof interests);
      setPublicLibrary((libraryResult.data ?? []) as LibraryCandle[]);
    } catch (error) {
      console.error("Erro ao carregar informações do perfil público:", error);
      // O cartão público permanece aberto com os dados já disponíveis no chat ou no feed.
    } finally {
      setPublicProfileLoading(false);
    }
  }

  async function saveHouse(house: HouseId | null) {
    if (!userId || houseSaving) return;
    setHouseSaving(true);
    const { error } = await (supabase as any).from("member_houses")
      .upsert({ user_id: userId, house, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setHouseSaving(false);
    if (error) { toast.error("Não foi possível atualizar sua casa."); return; }
    setMemberHouses(current => ({ ...current, [userId]: house }));
    window.dispatchEvent(new Event(HOUSE_CHANGED_EVENT));
    toast.success(house ? "Sua casa foi atualizada!" : "Você pode descobrir sua casa quando quiser.");
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
    {publicMember && <div className="fixed inset-0 z-[110] overflow-y-auto bg-[#101a13]/75 p-2 backdrop-blur-sm sm:p-4 md:p-8" role="dialog" aria-modal="true" aria-label={"Perfil de " + publicMember.username}>
      <section className="relative mx-auto my-3 min-h-[80vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-[#b99a66]/70 bg-[#f5efdf] text-[#29382d] shadow-[0_28px_100px_rgba(0,0,0,0.42)] sm:my-5 sm:rounded-3xl">
        <div className="pointer-events-none sticky top-2 z-[130] -mb-14 flex justify-end px-3 pt-3">
          <button type="button" onClick={() => setPublicMember(null)} className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#e0c788] bg-[#20382b] text-[#f7efda] shadow-[0_5px_18px_rgba(0,0,0,0.35)] transition hover:scale-105 hover:bg-[#314b37] focus:outline-none focus:ring-4 focus:ring-[#d7bd83]/60" aria-label="Fechar perfil" title="Fechar perfil"><X size={22} strokeWidth={2.8}/><span className="sr-only">Fechar perfil</span></button>
        </div>
        <header className="relative flex flex-col items-center gap-3 overflow-hidden border-b border-[#b99a66]/55 bg-[radial-gradient(ellipse_at_top,rgba(207,174,111,0.25),transparent_58%),linear-gradient(135deg,#263b2d_0%,#3b513b_56%,#1b2a20_100%)] px-5 py-9 text-center text-[#f7f0df] sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute inset-3 rounded-xl border border-[#d7bd83]/25 sm:inset-5"/>
          <p className="relative text-[10px] font-semibold uppercase tracking-[.3em] text-[#d7bd83] sm:text-xs">Círculo do Fogo · Hiraeth</p>
          <div className="relative mt-2 h-24 w-24 overflow-hidden rounded-full border-[3px] border-[#d7bd83] bg-[#e8dcc3] shadow-[0_0_0_6px_rgba(215,189,131,0.12),0_10px_28px_rgba(0,0,0,0.3)]">
            {publicMember.avatar_url ? <img src={publicMember.avatar_url} alt={"Foto de " + publicMember.username} className="h-full w-full object-cover"/> : <UserRound className="m-auto mt-7 text-[#4a5d48]" size={34}/>}
          </div>
          <div className="relative flex items-center gap-2"><h2 className="font-display text-3xl leading-tight sm:text-4xl">{publicMember.username}</h2><HouseBadge house={memberHouses[publicMember.user_id]} large /></div>
          <p className="relative text-[10px] uppercase tracking-[.2em] text-[#e2d3b6]">Integrante da comunidade</p>
        </header>
        <nav className={"sticky top-0 z-10 grid border-b border-[#d8c9aa] bg-[#fbf7ec]/95 px-2 shadow-[0_4px_12px_rgba(70,52,28,0.06)] backdrop-blur " + (publicMember.library_visible ? "grid-cols-4" : "grid-cols-3")}>{([{id:"profile",label:"Perfil"},{id:"universe",label:"Meu Universo"},...(publicMember.library_visible ? [{id:"library" as const,label:"Minha Biblioteca"}] : []),{id:"posts",label:"Publicações"}] as const).map(item => <button key={item.id} type="button" onClick={() => setPublicSection(item.id)} className={"min-h-12 border-b-[3px] px-1 py-3 text-xs font-semibold transition-colors md:text-sm " + (publicSection === item.id ? "border-[#9a713d] text-[#334b37]" : "border-transparent text-[#766b57] hover:bg-[#eee5d3] hover:text-[#334b37]")}>{item.label}</button>)}</nav>
        {publicProfileLoading && <p className="py-3 text-center text-xs uppercase tracking-[.16em] text-[#7a705f]">Carregando informações do perfil...</p>}
        {publicSection === "profile" && <section className="mx-auto max-w-4xl px-4 py-7 sm:px-8 sm:py-10">
          <div className="mb-6 text-center"><p className="text-[10px] font-semibold uppercase tracking-[.26em] text-[#987747]">Conheça este integrante</p><h3 className="mt-2 font-display text-2xl text-[#293d2d] sm:text-3xl">Sobre {publicMember.username}</h3></div>
          <div className="grid gap-4 md:grid-cols-[1.25fr_.9fr]">
            <article className="rounded-2xl border border-[#ded0b5] bg-[#fffaf0] p-5 shadow-[0_5px_18px_rgba(73,55,30,0.05)] sm:p-6">
              <div className="flex items-center gap-2 text-[#8a7048]"><UserRound size={17}/><h4 className="text-xs font-bold uppercase tracking-[.17em]">Um pouco sobre mim</h4></div>
              {publicMember.bio?.trim() ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#4d493d]">{publicMember.bio}</p> : <p className="mt-4 text-sm italic leading-7 text-[#8b806c]">Este integrante ainda não adicionou uma apresentação.</p>}
            </article>
            <aside className="rounded-2xl border border-[#ded0b5] bg-[#eee6d6] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[#685536]"><Flame size={17}/><h4 className="text-xs font-bold uppercase tracking-[.17em]">Redes sociais</h4></div>
              <div className="mt-4 flex flex-col gap-2">
                {publicMember.instagram_url && <a href={publicMember.instagram_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-[#d5c4a2] bg-[#fffaf0] px-4 py-3 text-sm font-medium text-[#354b38] transition hover:border-[#a98248] hover:bg-white"><span>Instagram</span><span className="text-xs text-[#947449]">Abrir ↗</span></a>}
                {publicMember.tiktok_url && <a href={publicMember.tiktok_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-[#d5c4a2] bg-[#fffaf0] px-4 py-3 text-sm font-medium text-[#354b38] transition hover:border-[#a98248] hover:bg-white"><span>TikTok</span><span className="text-xs text-[#947449]">Abrir ↗</span></a>}
                {publicMember.other_social_url && <a href={publicMember.other_social_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-[#d5c4a2] bg-[#fffaf0] px-4 py-3 text-sm font-medium text-[#354b38] transition hover:border-[#a98248] hover:bg-white"><span>Outra rede social</span><span className="text-xs text-[#947449]">Abrir ↗</span></a>}
                {!publicMember.instagram_url && !publicMember.tiktok_url && !publicMember.other_social_url && <p className="text-sm italic leading-6 text-[#877b66]">Nenhuma rede social adicionada.</p>}
              </div>
            </aside>
          </div>
          {publicMember.library_visible && <div className="mt-6 rounded-2xl border border-[#d8c7a6] bg-[#eee6d6] p-5 text-center sm:p-6"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#8d7144]">Coleção pessoal</p><h4 className="mt-2 font-display text-2xl text-[#344a37]">Minha Biblioteca</h4><p className="mt-2 text-sm leading-6 text-[#706653]">As velas que fazem parte das histórias deste integrante.</p><button type="button" onClick={() => setPublicSection("library")} className="mt-4 rounded-full border border-[#9a713d] bg-[#354b38] px-6 py-3 text-xs font-semibold uppercase tracking-[.12em] text-[#f8f1e2] transition hover:bg-[#263b2d]">Ver biblioteca</button></div>}
        </section>}
        {publicSection === "universe" && <section className="mx-auto max-w-4xl px-4 py-7 sm:px-8 sm:py-9"><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#987747]">Livros, telas e paixões</p><h3 className="mb-5 mt-2 font-display text-3xl text-[#293d2d]">Meu Universo</h3><InterestBookshelf items={publicInterests}/></section>}
        {publicMember.library_visible && publicSection === "library" && <section className="mx-auto max-w-4xl px-4 py-7 sm:px-8 sm:py-9"><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#987747]">Coleção de velas</p><h3 className="mb-5 mt-2 font-display text-3xl text-[#293d2d]">Minha Biblioteca</h3><CandleBookshelf items={publicLibrary}/></section>}
        {publicSection === "posts" && <section className="mx-auto max-w-4xl space-y-5 px-4 py-7 sm:px-8 sm:py-9"><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#987747]">Círculo do Fogo</p><h3 className="font-display text-3xl text-[#293d2d]">Publicações</h3>{posts.filter(post => post.user_id === publicMember.user_id).map(post => <article key={post.id} className={`rounded-2xl border p-4 ${post.is_admin ? "border-[2px] border-[#b58a3b] bg-[linear-gradient(145deg,#f4dfaa_0%,#ead09a_48%,#f6e9c9_100%)] text-[#20382b] shadow-[0_8px_28px_rgba(125,89,28,0.18)]" : "border-[#ded0b5] bg-[#fffaf0] text-[#4d493d] shadow-sm"}`}>{post.body && <p className="whitespace-pre-wrap text-sm leading-7">{post.body}</p>}{post.image_urls?.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{post.image_urls.map(url => <img key={url} src={url} alt="Foto publicada" className="aspect-square w-full rounded-lg object-cover"/>)}</div>}<time className="mt-3 block text-xs text-[#8b806c]">{new Date(post.created_at).toLocaleString("pt-BR")}</time></article>)}{posts.filter(post => post.user_id === publicMember.user_id).length === 0 && <p className="rounded-xl border border-[#ded0b5] bg-[#fffaf0] px-5 py-10 text-center text-sm text-[#877b66]">Ainda não há publicações por aqui.</p>}</section>}
      </section>
    </div>}



    <main className="w-full px-0 pb-0 pt-0">
      <div className="community-shell min-h-[calc(100dvh-4rem)] w-full overflow-hidden border-y border-primary/25 bg-background">
        {!loading && joined &&           <nav className="sticky top-0 z-20 grid grid-cols-4 gap-1.5 border-b border-primary/20 bg-background/95 px-2 py-2 shadow-sm backdrop-blur sm:gap-3 sm:px-5" aria-label="Áreas da comunidade">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`min-h-11 rounded-full border px-1.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${tab === item.id ? "border-[#878e47] bg-[#344b36] text-[#f7efda]" : "border-primary/25 bg-secondary/40 text-foreground hover:bg-primary/10"}`}>{item.label}</button>)}</nav>}
        {(!joined || tab === "inicio") && <div className="relative flex min-h-[260px] items-end overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_rgba(190,151,83,0.25),_transparent_45%),linear-gradient(125deg,#101b14,#263d2c_58%,#111b15)] px-6 py-10 md:min-h-[320px] md:px-14 md:py-14">
          <div className="relative max-w-3xl"><p className="mb-3 text-xs font-semibold uppercase tracking-[.25em] text-[#e1c58e]">Hiraeth · Onde toda história tem companhia</p><h1 className="font-display text-5xl leading-none text-[#f5edda] md:text-7xl">Comunidade Círculo do Fogo</h1><p className="mt-5 text-sm uppercase tracking-[0.2em] text-[#d5bd82]">Um lugar para pertencer</p></div>
        </div>}
        {loading ? <p className="p-8 text-muted-foreground">Carregando...</p> : !joined ? <section className="mx-auto max-w-4xl px-6 py-16 text-center md:py-24">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary"><Flame size={30}/></div><p className="eyebrow tracking-[0.3em]">Sua comunidade começa aqui</p><h2 className="mt-4 font-display text-4xl md:text-5xl">Sua próxima conexão começa aqui</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground">O Círculo do Fogo é o ponto de encontro de quem ama histórias. Converse, compartilhe suas descobertas, mostre o que está lendo e encontre pessoas que entendem os universos que fazem parte de você.</p>
          <button onClick={() => void joinCommunity()} disabled={saving} className="btn-gold mt-9 min-h-14 rounded-full px-10 text-sm uppercase tracking-[0.16em] shadow-lg shadow-primary/10">{saving ? "Entrando..." : "Participar da comunidade"}</button>
        </section> : <>

          {tab === "inicio" && <section className="mx-auto w-full max-w-6xl space-y-12 px-5 py-10 md:px-10 md:py-14">
            <div className="mx-auto max-w-3xl text-center">
              <p className="eyebrow tracking-[0.28em]">Mais do que uma comunidade, um lugar para pertencer</p>
              <h2 className="mt-3 font-display text-3xl md:text-5xl">Aqui, toda história encontra companhia.</h2>
              <p className="mt-5 text-base leading-8 text-muted-foreground md:text-lg">O Círculo do Fogo é o espaço de encontro da Hiraeth para quem encontra nas histórias um jeito de sentir, imaginar e se conectar. É um lugar para conversar sobre livros, filmes e séries, dividir descobertas, conhecer pessoas com gostos parecidos e criar novas lembranças em torno dos universos que amamos.</p>
            </div>
            <CommunityStorySpotlight onAnswer={() => { setTab("feed"); setComposerOpen(true); }} />
            <HouseCup />
            <MagicPolls />
            <div className="grid gap-5 md:grid-cols-3">
              <article className="community-overview-card rounded-3xl border p-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><MessageCircle/></div><h3 className="font-display text-2xl">Converse no Chat</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">Participe das conversas em tempo real, troque ideias, faça perguntas e fale sobre aquilo que está lendo ou assistindo. É o cantinho para uma conversa espontânea entre integrantes.</p></article>
              <article className="community-overview-card rounded-3xl border p-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><ImagePlus/></div><h3 className="font-display text-2xl">Compartilhe no Feed</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">Publique fotos, opiniões, trechos de experiências e descobertas. Reaja às publicações com corações e foguinhos, comente e participe do que outras pessoas estão compartilhando.</p></article>
              <article className="community-overview-card rounded-3xl border p-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><BookOpen/></div><h3 className="font-display text-2xl">Mostre seu Universo</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">No seu perfil, conte um pouco sobre você e monte seu Universo com capas e títulos de livros, filmes e séries que fazem parte da sua história. Descubra afinidades com outros integrantes.</p></article>
            </div>
            <div className="community-overview-panel grid gap-8 rounded-3xl border p-6 md:grid-cols-2 md:p-9">
              <div><p className="eyebrow">Nosso propósito</p><h3 className="mt-2 font-display text-3xl">Um espaço feito de respeito e afeto.</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">Cada pessoa vive uma história de um jeito. Aqui, opiniões diferentes são bem-vindas: converse com gentileza, respeite o gosto de cada integrante, dê crédito quando compartilhar algo de outra pessoa e ajude a manter um ambiente acolhedor.</p></div>
              <div><p className="eyebrow">Como começar</p><ol className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground"><li><strong className="text-foreground">01. Apresente-se:</strong> personalize seu perfil e conte um pouco sobre você.</li><li><strong className="text-foreground">02. Abra uma conversa:</strong> passe pelo Chat e conheça quem está por aqui.</li><li><strong className="text-foreground">03. Compartilhe:</strong> publique no Feed e adicione seus favoritos ao Meu Universo.</li></ol></div>
            </div>
            <div className="text-center"><p className="font-display text-2xl italic text-primary">Acenda uma conversa. Compartilhe uma história. Faça parte do Círculo.</p><button type="button" onClick={() => setTab("chat")} className="btn-gold mt-5 rounded-full">Ir para o Chat</button></div>
          </section>}
          {tab === "chat" && <section className="flex h-[calc(100dvh-9.5rem)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-primary/15 bg-[#f4f0e7] dark:bg-[#172019]">
            <div className="flex items-center gap-3 border-b border-primary/15 bg-card px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#20382b] text-[#e8d8b4]"><Flame size={20}/></div>
              <div><h2 className="font-display text-lg">Círculo do Fogo</h2><p className="text-xs text-muted-foreground">Conversa da comunidade</p></div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_20%_20%,rgba(179,148,91,0.08),transparent_30%)] px-3 py-5 md:px-8">
              {messages.map(message => {
                const ownMessage = message.user_id === userId;
                const messageIdentity = getCommunityMessageIdentity(message.is_admin === true);
                return <article key={message.id} className={`flex w-full flex-col ${ownMessage ? "items-end" : "items-start"}`}>
                  <div className={`relative w-fit max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm ${ownMessage ? "rounded-tr-sm border border-[#c6d5bd] bg-[#e3edda] text-[#243629] dark:border-[#50664f] dark:bg-[#304532] dark:text-[#f1f0e7]" : "rounded-tl-sm border border-[#e4ddcf] bg-[#f7efda] text-[#33352f] dark:border-[#455047] dark:bg-[#26332a] dark:text-[#f1f0e7]"} ${messageIdentity.bubbleClassName} ${message.is_pinned ? "ring-2 ring-[#b99a5b]/70" : ""}`}>
                    <div className="mb-1 flex items-center gap-2 pr-6">
                      <button type="button" onClick={() => void openPublicProfile(message.user_id)} className="text-xs font-bold text-[#80653a] hover:underline dark:text-[#d6bd88]">{message.is_admin ? "Hiraeth" : message.community_profiles?.username || "Integrante"}</button><HouseBadge house={memberHouses[message.user_id]} />
                      {messageIdentity.label && <span className="community-official-badge">{messageIdentity.label}</span>}{message.is_pinned && <span className="text-[9px] font-semibold text-[#a27b35]">Fixada</span>}
                    </div>
                    {editingMessageId === message.id ? <div className="min-w-[220px] space-y-2">
                      <textarea value={editingMessageBody} onChange={e => setEditingMessageBody(e.target.value)} maxLength={3000} className="w-full rounded-lg border border-primary/20 bg-background p-2 text-sm text-foreground"/>
                      <div className="flex justify-end gap-3"><button type="button" onClick={() => void saveMessageEdit(message)} className="text-xs font-semibold text-primary">Salvar</button><button type="button" onClick={() => setEditingMessageId(null)} className="text-xs text-muted-foreground">Cancelar</button></div>
                    </div> : <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>}
                    <div className="mt-1.5 flex items-center justify-end gap-1.5">
                      <time className="text-[10px] text-muted-foreground">{new Date(message.created_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}{message.edited_at ? " · editada" : ""}</time>
                      {(ownMessage || isAdmin) && <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" aria-label="Opções da mensagem" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#9a987f]/35 bg-white/70 text-[#52604f] shadow-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#8d7041] dark:border-[#a9b19f]/35 dark:bg-[#1d2a20] dark:text-[#e2e6d8] dark:hover:bg-[#344637]"><MoreVertical size={16}/></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="top" sideOffset={6} className="z-[9999] w-48 border border-primary/20 bg-background text-foreground shadow-xl">
                          {ownMessage && <>
                            <DropdownMenuItem onSelect={() => { setEditingMessageId(message.id); setEditingMessageBody(message.body); }}>Editar mensagem</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => void deleteMessage(message)} className="text-red-600 focus:bg-red-50 focus:text-red-700">Apagar mensagem</DropdownMenuItem>
                          </>}
                          {isAdmin && <>
                            {ownMessage && <div className="my-1 h-px bg-border"/>}
                            <DropdownMenuItem onSelect={() => void togglePinMessage(message)}>{message.is_pinned ? "Desafixar mensagem" : "Fixar mensagem"}</DropdownMenuItem>
                          </>}
                        </DropdownMenuContent>
                      </DropdownMenu>}
                    </div>
                  </div>
                  <div className={`mt-1 flex gap-1.5 ${ownMessage ? "mr-2" : "ml-2"}`}>
                    <button type="button" disabled={reactingMessageId === message.id} onClick={() => void reactToMessage(message, "heart")} aria-label="Reagir com coração" aria-pressed={message.myReaction === "heart"} className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 py-1 text-xs shadow-sm transition-colors disabled:cursor-wait disabled:opacity-50 ${message.myReaction === "heart" ? "border-[#9b4a43] bg-[#f8e4e0] text-[#7d2823]" : "border-primary/20 bg-background text-foreground hover:bg-primary/10"}`}>
                      <Heart size={13} className={message.myReaction === "heart" ? "fill-current" : ""}/>{(message.heartCount ?? 0) > 0 && <span>{message.heartCount}</span>}
                    </button>
                    <button type="button" disabled={reactingMessageId === message.id} onClick={() => void reactToMessage(message, "fire")} aria-label="Reagir com fogo" aria-pressed={message.myReaction === "fire"} className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 py-1 text-xs shadow-sm transition-colors disabled:cursor-wait disabled:opacity-50 ${message.myReaction === "fire" ? "border-[#b66a28] bg-[#fff0d9] text-[#824714]" : "border-primary/20 bg-background text-foreground hover:bg-primary/10"}`}>
                      🔥{(message.fireCount ?? 0) > 0 && <span>{message.fireCount}</span>}
                    </button>
                  </div>
                </article>;
              })}
              {messages.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">A conversa começa com você. Deixe a primeira mensagem!</p>}
            </div>
            <form onSubmit={sendMessage} className="sticky bottom-0 flex items-center gap-2 border-t border-primary/15 bg-card px-3 py-3 md:px-6">
              <input value={body} onChange={e => setBody(e.target.value)} maxLength={3000} placeholder="Digite uma mensagem..." className="min-w-0 flex-1 rounded-full border border-[#c9bea8] bg-[#fbf7ec] px-4 py-3 text-sm text-[#29342c] placeholder:text-[#756d60] outline-none transition focus:border-[#7c8b70] focus:ring-2 focus:ring-[#7c8b70]/20 dark:bg-[#f4f0e7] dark:text-[#29342c] dark:placeholder:text-[#756d60]" />
              <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#20382b] text-[#f5edda]" type="submit" aria-label="Enviar mensagem"><Send size={18}/></button>
            </form>
          </section>}{tab === "feed" && <section className="hiraeth-community-feed min-h-[calc(100dvh-9.5rem)] space-y-5 px-0 pb-8"><div className="px-4 pt-6 md:px-8"><p className="text-[11px] font-semibold uppercase tracking-[.2em] text-primary">Vozes do Círculo</p><h2 className="mt-2 font-display text-3xl">Histórias ao redor do fogo</h2></div><div className="border-b border-primary/15 bg-background px-4 py-4 md:px-8"><button type="button" onClick={() => setComposerOpen(true)} className="flex w-full items-center gap-3 text-left"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#20382b] text-[#e8d8b4]"><ImagePlus size={20}/></span><span className="min-w-0 flex-1"><strong className="block text-sm font-medium">Criar uma publicação</strong><span className="text-xs text-muted-foreground">Compartilhe uma leitura, foto ou pensamento...</span></span><span className="rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">Criar post</span></button></div>{composerOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3" role="dialog" aria-modal="true" aria-label="Criar publicação"><div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-primary/25 bg-card shadow-2xl"><div className="flex items-center justify-between border-b border-primary/15 px-5 py-4"><h3 className="font-display text-2xl">Nova publicação</h3><button type="button" onClick={() => { if ((postBody.trim() || postFiles.length) && !window.confirm("Descartar esta publicação?")) return; setComposerOpen(false); setPostBody(""); setPostFiles([]); }} className="rounded-full p-2 hover:bg-primary/10" aria-label="Fechar"><X/></button></div><form onSubmit={async e => { await publishPost(e); }} className="mx-auto max-w-3xl space-y-3 border-t border-primary/10 p-4 md:p-6">
              <textarea value={postBody} onChange={e => setPostBody(e.target.value)} maxLength={5000} rows={4} placeholder="O que está passando pela sua cabeça?" className="w-full resize-y border border-primary/20 bg-card p-3 text-sm outline-none focus:border-primary" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ImagePlus size={18}/> Adicionar fotos<input id="community-post-images" type="file" accept="image/*" multiple className="sr-only" onChange={e => setPostFiles(Array.from(e.target.files ?? []).slice(0, 4))}/></label>
                <button type="submit" disabled={posting} className="btn-gold inline-flex items-center gap-2">{posting ? "Publicando..." : "Publicar"} <Send size={15}/></button>
              </div>
              {postFiles.length > 0 && <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{postFiles.length} foto(s) selecionada(s): {postFiles.map(file => file.name).join(", ")}</span><button type="button" onClick={() => { setPostFiles([]); const el = document.getElementById("community-post-images") as HTMLInputElement | null; if (el) el.value = ""; }} aria-label="Remover fotos selecionadas"><X size={15}/></button></div>}
              <p className="text-[11px] text-muted-foreground">Até 4 fotos por publicação, com limite de 8 MB por imagem.</p>
            </form></div></div>}<div className="mx-auto w-full max-w-3xl space-y-5 px-3 md:px-6">
            {posts.length === 0 ? <div className="border border-dashed border-primary/30 px-5 py-12 text-center"><Flame className="mx-auto text-primary" size={30}/><p className="mt-3 font-display text-xl">A primeira chama do Feed pode ser sua</p><p className="mt-1 text-sm text-muted-foreground">Compartilhe uma foto ou escreva algo para começar.</p></div> : posts.map(post => <article key={post.id} className={`overflow-hidden rounded-xl border transition-shadow ${post.is_admin ? "border-[3px] border-[#b58a3b] bg-[linear-gradient(145deg,#f4dfaa_0%,#ead09a_48%,#f6e9c9_100%)] text-[#20382b] shadow-[0_8px_28px_rgba(125,89,28,0.28),inset_0_0_0_2px_rgba(255,255,255,0.55)] dark:bg-[linear-gradient(145deg,#4b3b20_0%,#66502b_48%,#3b3827_100%)] dark:text-[#f7edcf]" : "border border-primary/20 bg-gradient-to-br from-background via-background to-primary/[0.04] shadow-sm"}`}>
              <div className="flex items-start gap-3 p-4">
                <button type="button" onClick={() => void openPublicProfile(post.user_id)} aria-label={"Abrir perfil de " + post.author} className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#20382b] text-[#e8d8b4]">{post.avatar_url ? <img src={post.avatar_url} alt="" className="h-full w-full object-cover"/> : post.author.slice(0,1).toUpperCase()}</button>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><button type="button" onClick={() => void openPublicProfile(post.user_id)} className="block text-sm font-semibold hover:underline">{post.author}</button><HouseBadge house={memberHouses[post.user_id]} /></div>{post.is_admin && <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#806126]/60 bg-[#20382b] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f5dfaa]">✦ Hiraeth oficial</span>}<time className={`block text-xs ${post.is_admin ? "text-[#66502b] dark:text-[#f0dfb5]" : "text-muted-foreground"}`}>{new Date(post.created_at).toLocaleString("pt-BR")}</time></div>
                {(post.user_id === userId || isAdmin) && <div className="flex gap-1">{post.user_id === userId && <button type="button" onClick={() => void editPost(post)} aria-label="Editar publicação" className="rounded p-2 text-muted-foreground hover:text-primary"><span className="text-xs">Editar</span></button>}<button type="button" onClick={() => void deletePost(post)} aria-label="Excluir publicação" className="rounded p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16}/></button></div>}
              </div>
              {post.body && <p className="whitespace-pre-wrap px-4 pb-4 text-sm leading-relaxed">{post.body}</p>}
              {post.image_urls?.length > 0 && <div className={`grid gap-1 ${post.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{post.image_urls.map(url => <img key={url} src={url} alt="Foto compartilhada no Círculo do Fogo" loading="lazy" className={`w-full object-cover ${post.image_urls.length === 1 ? "max-h-[560px]" : "aspect-square"}`}/>)}</div>}
              <div className="flex flex-wrap items-center gap-2 border-t border-primary/10 px-3 py-3">
                <button type="button" disabled={reacting === post.id} onClick={() => void reactToPost(post, "heart")} aria-pressed={post.myReaction === "heart"} className={`${post.myReaction === "heart" ? "community-heart-active " : ""}inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors ${post.myReaction === "heart" ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"}`}><Heart size={18} fill={post.myReaction === "heart" ? "currentColor" : "none"}/> <span>{post.heartCount}</span><span className="sr-only">corações verdes</span></button>
                <button type="button" disabled={reacting === post.id} onClick={() => void reactToPost(post, "fire")} aria-pressed={post.myReaction === "fire"} className={`${post.myReaction === "fire" ? "community-fire-active " : ""}inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors ${post.myReaction === "fire" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-transparent text-muted-foreground hover:bg-orange-50 hover:text-orange-700"}`}><Flame size={19} fill={post.myReaction === "fire" ? "currentColor" : "none"}/> <span>{post.fireCount}</span><span className="sr-only">foguinhos</span></button>
                <button type="button" onClick={() => void toggleComments(post.id)} className="ml-auto inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-primary/5 hover:text-primary"><MessageCircle size={17}/> {post.commentCount} comentários</button>
              </div>
              {openComments === post.id && <div className="space-y-3 border-t border-primary/10 bg-card/40 dark:bg-card p-4">
                {(comments[post.id] ?? []).map(comment => <div key={comment.id} className="text-sm"><span className="inline-flex items-center gap-1.5"><span className="font-semibold text-primary">{comment.author}</span><HouseBadge house={memberHouses[comment.user_id]} /></span><p className="mt-0.5 whitespace-pre-wrap">{comment.body}</p><time className="text-[10px] text-muted-foreground">{new Date(comment.created_at).toLocaleString("pt-BR")}</time></div>)}
                {(comments[post.id] ?? []).length === 0 && <p className="text-xs text-muted-foreground">Seja a primeira pessoa a comentar.</p>}
                <form onSubmit={e => void addComment(e, post.id)} className="flex gap-2"><input value={commentDrafts[post.id] ?? ""} onChange={e => setCommentDrafts(current => ({ ...current, [post.id]: e.target.value }))} maxLength={2000} placeholder="Escreva um comentário..." className="min-w-0 flex-1 border bg-background dark:bg-card px-3 py-2 text-sm"/><button type="submit" aria-label="Enviar comentário" className="btn-gold px-3"><Send size={16}/></button></form>
              </div>}
            </article>)}
          </div></section>}
          {tab === "perfil" && <section className="mx-auto w-full max-w-6xl px-4 py-7 md:px-8 md:py-10">
            <div className="mb-6"><p className="eyebrow">Sua presença no Círculo</p><h2 className="mt-1 font-display text-3xl">Meu perfil</h2><p className="mt-2 text-sm text-muted-foreground">Cuide das suas informações, reúna seus universos favoritos e mostre sua coleção Hiraeth.</p></div>
            <nav className="mb-7 grid grid-cols-2 border-b border-primary/20 sm:grid-cols-4">{([{id:"info",label:"Informações"},{id:"universe",label:"Meu Universo"},{id:"library",label:"Minha Biblioteca"},{id:"posts",label:"Publicações"}] as const).map(item => <button key={item.id} type="button" onClick={() => setProfileSection(item.id)} className={"border-b-2 px-2 py-3 text-sm " + (profileSection === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>{item.label}</button>)}</nav>
            {profileSection === "info" && <form onSubmit={saveProfile} className="mx-auto grid max-w-2xl gap-4 rounded-xl border border-primary/20 bg-background/60 p-5 md:p-7"><div className="flex items-center gap-4"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-[#20382b] text-[#e8d8b4]">{profile.avatar_url ? <img src={profile.avatar_url} alt="Sua foto de perfil" className="h-full w-full object-cover"/> : <UserRound size={34}/>}</div><label className="cursor-pointer text-sm text-primary underline">{avatarUploading ? "Enviando foto..." : "Alterar foto de perfil"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={avatarUploading} onChange={e => void uploadAvatar(e.target.files?.[0])}/></label></div>
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                <div className="mb-3 flex items-center gap-2"><p className="font-display text-xl">Minha Casa</p><HouseBadge house={memberHouses[userId]} /></div>
                <p className="mb-4 text-xs text-muted-foreground">Sua escolha participa da Taça das Casas e aparece como um selo ao lado do seu nome. Você pode mudar quando quiser.</p>
                <HouseChoiceCards selected={memberHouses[userId] ?? null} onSelect={saveHouse} busy={houseSaving} />
              </div><label className="grid gap-2 text-sm">Nome de usuário<input required maxLength={30} value={profile.username} onChange={e => setProfile({ ...profile, username: e.target.value })} className="border bg-transparent p-3"/></label><label className="grid gap-2 text-sm">Sobre mim<textarea maxLength={500} value={profile.bio ?? ""} onChange={e => setProfile({ ...profile, bio: e.target.value })} className="border bg-transparent p-3" rows={3}/></label><label className="flex items-start gap-3 rounded-lg border border-primary/20 p-3 text-sm"><input type="checkbox" checked={profile.library_visible !== false} onChange={e => setProfile({ ...profile, library_visible: e.target.checked })} className="mt-1 accent-[var(--primary)]"/><span><strong className="block text-foreground">Exibir minha Biblioteca na Comunidade</strong><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Quando ativado, outros integrantes poderão visualizar suas velas e os detalhes que você compartilhou. Somente você poderá editar sua coleção.</span></span></label><label className="grid gap-2 text-sm">Instagram<input value={profile.instagram_url ?? ""} onChange={e => setProfile({ ...profile, instagram_url: e.target.value })} className="border bg-transparent p-3" placeholder="https://instagram.com/..."/></label><label className="grid gap-2 text-sm">TikTok<input value={profile.tiktok_url ?? ""} onChange={e => setProfile({ ...profile, tiktok_url: e.target.value })} className="border bg-transparent p-3" placeholder="https://tiktok.com/@..."/></label><label className="grid gap-2 text-sm">Outra rede social<input value={profile.other_social_url ?? ""} onChange={e => setProfile({ ...profile, other_social_url: e.target.value })} className="border bg-transparent p-3"/></label><button disabled={saving} className="btn-gold justify-self-start">{saving ? "Salvando..." : "Salvar perfil"}</button></form>}
            {profileSection === "universe" && <section className="rounded-xl border border-primary/20 bg-background/60 p-5 md:p-7"><p className="eyebrow">Livros, telas e paixões</p><h3 className="mt-1 font-display text-3xl">Meu Universo</h3><p className="mt-1 text-sm text-muted-foreground">Adicione livros, filmes, séries e outros interesses. Eles aparecem em uma galeria de capas, com livros, filmes e séries lado a lado.</p><form onSubmit={addInterest} className="mt-5 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]"><select value={interestType} onChange={e => setInterestType(e.target.value as typeof interestType)} className="border bg-background px-3 py-2 text-sm"><option value="book">Livro</option><option value="movie">Filme</option><option value="series">Série</option><option value="other">Outro</option></select><input value={interestTitle} onChange={e => setInterestTitle(e.target.value)} maxLength={160} placeholder="Nome do livro, filme, série..." className="min-w-0 border bg-background px-3 py-2 text-sm"/><button type="submit" disabled={interestUploading} className="btn-gold">{interestUploading ? "Salvando..." : "Adicionar"}</button><label className="sm:col-span-3 flex cursor-pointer items-center gap-2 text-xs text-primary underline">Adicionar capa (opcional)<input id="community-interest-cover" type="file" accept="image/*" className="sr-only" onChange={e => setInterestCover(e.target.files?.[0] ?? null)}/></label>{interestCover && <p className="sm:col-span-3 text-xs text-muted-foreground">{interestCover.name}</p>}</form><div className="mt-7"><InterestBookshelf items={interests} onSelect={item => { setSelectedInterest(item); setEditingInterestTitle(item.title); setEditingInterestType(item.interest_type); setEditingInterestCover(null); }}/></div>{selectedInterest && <div className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto bg-black/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={"Editar interesse " + selectedInterest.title}><section className="relative my-auto w-full max-w-md rounded-xl border border-[#d6c9ae] bg-[#f7f1e5] p-5 text-[#29342c] shadow-2xl sm:p-6"><button type="button" onClick={() => { setSelectedInterest(null); setEditingInterestCover(null); }} disabled={interestUploading} className="absolute right-3 top-3 rounded-full p-2 text-[#29342c] hover:bg-[#ece4d3]" aria-label="Fechar"><X size={19}/></button><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#806b47]">Meu Universo</p><h4 className="mt-2 pr-8 font-display text-2xl text-[#29342c]">Editar interesse</h4><div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-[#29342c]">Nome<input value={editingInterestTitle} onChange={event => setEditingInterestTitle(event.target.value)} maxLength={160} className="mt-1 w-full rounded-md border border-[#c9bea8] bg-white px-3 py-3 text-[#29342c] placeholder:text-[#756d60] outline-none focus:border-[#506b4f]"/></label><label className="block text-sm font-semibold text-[#29342c]">Tipo<select value={editingInterestType} onChange={event => setEditingInterestType(event.target.value as CommunityInterest["interest_type"])} className="mt-1 w-full rounded-md border border-[#c9bea8] bg-white px-3 py-3 text-[#29342c]"><option value="book">Livro</option><option value="movie">Filme</option><option value="series">Série</option><option value="other">Outro</option></select></label><label className="block text-sm font-semibold text-[#29342c]">Trocar capa (opcional)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => setEditingInterestCover(event.currentTarget.files?.[0] ?? null)} className="mt-2 block w-full text-sm text-[#4e584c] file:mr-3 file:rounded-full file:border file:border-[#a99b7d] file:bg-[#ece4d3] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#29342c]"/></label>{editingInterestCover && <p className="text-xs text-[#625d50]">{editingInterestCover.name}</p>}</div><div className="mt-6 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => void removeSelectedInterest()} disabled={interestUploading} className="rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Excluir</button><div className="flex gap-2"><button type="button" onClick={() => { setSelectedInterest(null); setEditingInterestCover(null); }} disabled={interestUploading} className="rounded-full border border-[#b6aa92] px-4 py-2 text-sm font-medium text-[#29342c] hover:bg-[#ece4d3]">Cancelar</button><button type="button" onClick={() => void saveInterestEdit()} disabled={interestUploading} className="btn-gold">{interestUploading ? "Salvando..." : "Salvar"}</button></div></div></section></div>}</section>}
            {profileSection === "library" && <section className="rounded-xl border border-primary/20 bg-background/60 p-5 md:p-7"><p className="eyebrow">Sua coleção Hiraeth</p><h3 className="mt-1 font-display text-3xl">Minha Biblioteca</h3><p className="mt-1 text-sm text-muted-foreground">Suas compras aparecem automaticamente aqui. Registre também suas velas antigas, complete os detalhes e avalie com foguinhos depois que o pedido for entregue.</p><div className="mt-6"><CandleBookshelf categoryOptions={categoryOptions} items={library} editable onAdd={addLibraryCandle} onUpdate={updateLibraryCandle} onFavorite={toggleLibraryFavorite} onRemove={item => removeLibraryCandle(item.id)} onMarkFinished={toggleLibraryFinished}/></div></section>}
            {profileSection === "posts" && <section className="mx-auto max-w-3xl space-y-4"><h3 className="font-display text-3xl">Minhas publicações</h3>{posts.filter(post => post.user_id === userId).map(post => <article key={post.id} className="border border-primary/20 bg-background/60 p-4"><p className="whitespace-pre-wrap text-sm">{post.body}</p>{post.image_urls?.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{post.image_urls.map(url => <img key={url} src={url} alt="Foto publicada" className="aspect-square w-full object-cover"/>)}</div>}<time className="mt-3 block text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString("pt-BR")}</time></article>)}{posts.filter(post => post.user_id === userId).length === 0 && <p className="text-sm text-muted-foreground">Você ainda não publicou no Feed.</p>}</section>}
          </section>}

        </>}
      </div>
    </main></div>;
}
