import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { toast } from "sonner";

type Tab = "chat" | "feed" | "perfil";
type MemberProfile = { username: string; avatar_url: string | null; instagram_url: string | null; tiktok_url: string | null; other_social_url: string | null; bio: string | null };
type Message = { id: string; user_id: string; body: string; created_at: string; community_profiles?: { username: string; avatar_url: string | null } | null };

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

  async function loadMessages() {
    const { data, error } = await (supabase as any).from("community_messages")
      .select("id,user_id,body,created_at,community_profiles(username,avatar_url)")
      .order("created_at", { ascending: true }).limit(150);
    if (!error) setMessages((data ?? []) as Message[]);
  }

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUserId(data.user.id);
      const { data: membership } = await (supabase as any).from("community_memberships").select("user_id").eq("user_id", data.user.id).maybeSingle();
      if (membership) {
        setJoined(true);
        const { data: p } = await (supabase as any).from("community_profiles").select("*").eq("user_id", data.user.id).maybeSingle();
        if (p) setProfile(p);
        await loadMessages();
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
    await loadMessages();
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

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await (supabase as any).from("community_profiles").upsert({ user_id: userId, ...profile, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error("Não foi possível salvar seu perfil.");
    else toast.success("Perfil atualizado.");
  }

  const tabs: { id: Tab; label: string }[] = [{ id: "chat", label: "Chat" }, { id: "feed", label: "Feed" }, { id: "perfil", label: "Meu perfil" }];

  return <div className="min-h-screen"><SiteHeader />
    <main className="mx-auto max-w-5xl px-5 pb-20 pt-20 md:px-8">
      <div className="overflow-hidden border border-primary/25 bg-card">
        <div className="flex min-h-52 items-end bg-gradient-to-br from-[#17251b] via-[#263b2b] to-[#111b15] p-8 md:min-h-64 md:p-12">
          <div><p className="text-xs uppercase tracking-[0.35em] text-[#d5bd82]">Comunidade Hiraeth</p><h1 className="mt-3 font-display text-4xl text-[#f5edda] md:text-6xl">Círculo do Fogo</h1><p className="mt-3 max-w-xl text-sm text-[#eee5d3]/80">Um lugar para leitores, sonhadores e pessoas que encontram um pouco de si nas histórias.</p></div>
        </div>
        {loading ? <p className="p-8 text-muted-foreground">Carregando...</p> : !joined ? <section className="mx-auto max-w-2xl px-6 py-12 text-center">
          <p className="eyebrow">Seja bem-vindo</p><h2 className="mt-3 font-display text-3xl">Sua próxima conexão começa aqui</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">O Círculo do Fogo é a comunidade da Hiraeth: um espaço para conversar, compartilhar leituras, descobrir novos universos e conhecer pessoas que amam as mesmas histórias que você.</p>
          <button onClick={() => void joinCommunity()} disabled={saving} className="btn-gold mt-8">{saving ? "Entrando..." : "Participar da comunidade"}</button>
        </section> : <>
          <nav className="flex overflow-x-auto border-b border-primary/20" aria-label="Áreas da comunidade">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`shrink-0 border-b-2 px-6 py-4 text-sm ${tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{item.label}</button>)}</nav>
          {tab === "chat" && <section className="p-5 md:p-8"><div className="mb-5"><h2 className="font-display text-2xl">Conversa ao redor da chama</h2><p className="text-sm text-muted-foreground">Um chat público para os integrantes do Círculo.</p></div><div className="max-h-[55vh] min-h-64 space-y-3 overflow-y-auto border border-primary/15 bg-background/50 p-4">{messages.map(message => <article key={message.id} className={`max-w-[90%] rounded-md border p-3 ${message.user_id === userId ? "ml-auto border-primary/30 bg-primary/5" : "border-border bg-card"}`}><p className="mb-1 text-xs font-semibold text-primary">{message.community_profiles?.username || "Integrante"}</p><p className="whitespace-pre-wrap text-sm">{message.body}</p><time className="mt-2 block text-right text-[10px] text-muted-foreground">{new Date(message.created_at).toLocaleString("pt-BR")}</time></article>)}{messages.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">A conversa começa com você. Deixe a primeira mensagem!</p>}</div><form onSubmit={sendMessage} className="mt-4 flex gap-2"><input value={body} onChange={e => setBody(e.target.value)} maxLength={3000} placeholder="Escreva sua mensagem..." className="min-w-0 flex-1 border bg-transparent px-4 py-3 text-sm" /><button className="btn-gold" type="submit">Enviar</button></form></section>}
          {tab === "feed" && <section className="p-8 text-center"><h2 className="font-display text-2xl">Feed da comunidade</h2><p className="mt-3 text-muted-foreground">O espaço de publicações com fotos, textos e comentários será a próxima etapa de construção.</p></section>}
          {tab === "perfil" && <form onSubmit={saveProfile} className="mx-auto grid max-w-2xl gap-4 p-6 md:p-10"><h2 className="font-display text-2xl">Meu perfil no Círculo</h2><label className="grid gap-2 text-sm">Nome de usuário<input required maxLength={30} value={profile.username} onChange={e => setProfile({ ...profile, username: e.target.value })} className="border bg-transparent p-3" /></label><label className="grid gap-2 text-sm">Sobre mim<textarea maxLength={500} value={profile.bio ?? ""} onChange={e => setProfile({ ...profile, bio: e.target.value })} className="border bg-transparent p-3" rows={3} /></label><label className="grid gap-2 text-sm">Instagram<input value={profile.instagram_url ?? ""} onChange={e => setProfile({ ...profile, instagram_url: e.target.value })} className="border bg-transparent p-3" placeholder="https://instagram.com/..." /></label><label className="grid gap-2 text-sm">TikTok<input value={profile.tiktok_url ?? ""} onChange={e => setProfile({ ...profile, tiktok_url: e.target.value })} className="border bg-transparent p-3" placeholder="https://tiktok.com/@..." /></label><label className="grid gap-2 text-sm">Outra rede social<input value={profile.other_social_url ?? ""} onChange={e => setProfile({ ...profile, other_social_url: e.target.value })} className="border bg-transparent p-3" /></label><button disabled={saving} className="btn-gold justify-self-start">Salvar perfil</button><p className="text-xs text-muted-foreground">A foto de perfil e os interesses pessoais serão adicionados na próxima etapa.</p></form>}
        </>}
      </div>
    </main><SiteFooter /></div>;
}
