import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { InlineEditor } from "@/components/InlineEditor";
import { useAdminEdit } from "@/lib/admin-edit";
import { useTheme } from "@/lib/theme";
import { Instagram, Music2, MessageCircle, Mail } from "lucide-react";

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-1.5 rounded-full border border-primary/30 px-2.5 py-2 text-xs text-foreground transition-colors hover:bg-primary/10 sm:px-3"
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      aria-pressed={isDark}
    >
      <span aria-hidden="true">{isDark ? "☼" : "☾"}</span>
      <span className="hidden sm:inline">{isDark ? "Modo claro" : "Modo escuro"}</span>
    </button>
  );
}

export function SiteHeader() {
  const router = useRouter();
  const cart = useCart();
  const { isAdmin, editMode, toggle } = useAdminEdit();

  return (
    <header className="relative z-[80] w-full border-b border-primary/20 bg-background px-5 py-4 md:px-10">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-3">
        <button type="button" onClick={() => { if (router.history.canGoBack()) router.history.back(); else window.location.assign("/inicio"); }} className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/25 text-foreground transition-colors hover:bg-primary/10" aria-label="Voltar" title="Voltar"><span aria-hidden="true" className="text-xl leading-none">←</span></button>
        <details className="relative w-fit">
          <summary
            className="flex cursor-pointer list-none items-center gap-2 text-sm text-foreground/85 transition-colors hover:text-primary [&::-webkit-details-marker]:hidden"
            aria-label="Abrir menu da conta"
            title="Conta"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
            </svg>
            <span className="hidden sm:inline">Minha conta</span>
          </summary>
          <div className="absolute left-0 top-full z-[90] mt-3 w-56 overflow-hidden rounded-md border border-primary/30 bg-background p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.22)] ring-1 ring-background">
            <Link to="/configuracoes" search={{ tab: "perfil" }} className="block rounded px-3 py-2.5 text-sm text-foreground/85 transition-colors hover:bg-primary/10 hover:text-primary">
              Minha conta
            </Link>
            <Link to="/pedidos" className="block rounded px-3 py-2.5 text-sm text-foreground/85 transition-colors hover:bg-primary/10 hover:text-primary">
              Meus pedidos
            </Link>
            <Link to="/configuracoes" search={{ tab: "configuracoes" }} className="block rounded px-3 py-2.5 text-sm text-foreground/85 transition-colors hover:bg-primary/10 hover:text-primary">
              Configurações
            </Link>
          </div>
        </details>
        </div>

        <Link to="/inicio" className="justify-self-center font-display text-2xl italic font-medium tracking-[0.02em] text-foreground sm:text-3xl md:text-4xl" aria-label="Hiraeth - início">
          Hiraeth
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={toggle}
                aria-pressed={editMode}
                className="rounded-full border border-primary px-2.5 py-2 text-xs text-primary transition-colors hover:bg-primary/10 sm:px-3"
                title={editMode ? "Desativar edição do site" : "Ativar edição do site"}
              >
                {editMode ? "Sair da edição" : "Editar site"}
              </button>
              <Link to="/admin" className="hidden border border-primary/30 px-3 py-2 text-xs text-foreground transition-colors hover:border-primary sm:inline-flex">
                Administração
              </Link>
            </>
          )}
          <ThemeToggle />
          <Link
            to="/carrinho"
            className="relative flex items-center gap-2 text-sm text-foreground/85 transition-colors hover:text-primary"
            aria-label={`Sacola de compras${cart.count > 0 ? `, ${cart.count} itens` : ""}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 8h14l1 13H4L5 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            <span className="hidden sm:inline">Sacola</span>
            {cart.count > 0 && <span className="ml-[-4px] text-xs text-primary">{cart.count}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const [profile, setProfile] = useState<{ instagram_url: string; whatsapp_number: string; whatsapp_url: string; contact_email: string } | null>(null);
  const [tiktokUrl, setTiktokUrl] = useState("");
  useEffect(() => {
    void (async () => {
      const { data } = await (supabase as any).from("site_profile").select("instagram_url,whatsapp_number,whatsapp_url,contact_email").eq("id", true).maybeSingle();
      if (data) setProfile(data);
      const { data: footerData } = await (supabase as any).from("site_content").select("value").eq("key", "footer_settings").maybeSingle();
      setTiktokUrl(String(footerData?.value?.tiktok_url ?? ""));
    })();
  }, []);
  const whatsapp = profile?.whatsapp_url || (profile?.whatsapp_number ? `https://wa.me/${profile.whatsapp_number.replace(/\D/g, "")}` : "");
  async function saveContacts(values: Record<string, unknown>) {
    const payload = {
      instagram_url: String(values["instagram_url"] ?? ""),
      whatsapp_number: String(values["whatsapp_number"] ?? ""),
      whatsapp_url: String(values["whatsapp_url"] ?? ""),
      contact_email: String(values["contact_email"] ?? ""),
    };
    const { error } = await (supabase as any).from("site_profile").upsert(
      { id: true, ...payload, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
    if (error) throw new Error(`Falha ao salvar contatos (${error.code ?? "sem código"}): ${error.message}. Confirme que você está autenticada como administradora.`);
    setProfile(payload);
  }
  async function saveTikTok(values: Record<string, unknown>) {
    const next = String(values["tiktok_url"] ?? "").trim();
    const { error } = await (supabase as any).from("site_content").upsert({ key: "footer_settings", value: { tiktok_url: next }, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(`Falha ao salvar o TikTok (${error.code ?? "sem código"}): ${error.message}. Confirme que você está autenticada como administradora.`);
    setTiktokUrl(next);
  }
  return (
    <footer className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
      <p className="font-display text-lg italic text-primary">Onde a Chama Acesa te Espera</p>
      <nav aria-label="Redes sociais e contato da Hiraeth" className="mt-6 flex flex-wrap justify-center gap-6">
        {profile?.instagram_url && <a href={profile.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram da Hiraeth" title="Instagram" className="text-foreground transition hover:text-primary"><Instagram size={25} strokeWidth={1.8} /></a>}
        {tiktokUrl && <a href={tiktokUrl} target="_blank" rel="noreferrer" aria-label="TikTok da Hiraeth" title="TikTok" className="text-foreground transition hover:text-primary"><Music2 size={25} strokeWidth={1.8} /></a>}
        {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp da Hiraeth" title="WhatsApp" className="text-foreground transition hover:text-primary"><MessageCircle size={25} strokeWidth={1.8} /></a>}
        {profile?.contact_email && <a href={`mailto:${profile.contact_email}`} aria-label="E-mail da Hiraeth" title="E-mail" className="text-foreground transition hover:text-primary"><Mail size={25} strokeWidth={1.8} /></a>}
      </nav>
      <nav aria-label="Informações e ajuda" className="mx-auto mt-7 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-3 text-xs uppercase tracking-[.12em]">
        <Link to="/suporte" className="transition hover:text-primary">Suporte</Link>
        <Link to="/seguranca" className="transition hover:text-primary">Segurança e denúncias</Link>
        <Link to="/termos" className="transition hover:text-primary">Termos e comunidade</Link>
        <Link to="/privacidade" className="transition hover:text-primary">Privacidade</Link>
      </nav>
      <div className="mt-4"><InlineEditor label="contatos do rodapé" fields={[
        { name: "instagram_url", label: "Link do Instagram", type: "text" },
        { name: "whatsapp_number", label: "WhatsApp com DDI e DDD", type: "text" },
        { name: "whatsapp_url", label: "Link direto do WhatsApp (opcional)", type: "text" },
        { name: "contact_email", label: "E-mail de contato", type: "text" },
      ]} values={{ instagram_url: profile?.instagram_url ?? "", whatsapp_number: profile?.whatsapp_number ?? "", whatsapp_url: profile?.whatsapp_url ?? "", contact_email: profile?.contact_email ?? "" }} onSave={saveContacts} />
      <div className="mt-3"><InlineEditor label="TikTok do rodapé" fields={[{ name: "tiktok_url", label: "Link do TikTok", type: "text" }]} values={{ tiktok_url: tiktokUrl }} onSave={saveTikTok} /></div>
      </div>
      <p className="mt-5">© {new Date().getFullYear()} Hiraeth ·{" "}
        <span>Onde a Chama Acesa te Espera</span>
      </p>
    </footer>
  );
}

export function PageShell({
eyebrow,
title,
children,
}: {
eyebrow: string;
title: string;
children: ReactNode;
}) {
return (
<div className="min-h-screen">
<SiteHeader />
<main className="mx-auto max-w-2xl px-6 pb-20 pt-12 md:pt-16">
<p className="eyebrow">{eyebrow}</p>
<h1 className="mt-2 text-5xl text-foreground">{title}</h1>
<div className="mt-8 space-y-5 leading-relaxed text-foreground/85">
{children}
</div>
</main>
<SiteFooter />
</div>
);
}