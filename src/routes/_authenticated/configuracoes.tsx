import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações da conta — Hiraeth" }] }),
  component: AccountSettings,
});

function AccountSettings() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        navigate({ to: "/auth", search: { redirect: "/configuracoes" } });
        return;
      }
      const user = data.user;
      setName(user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? "");
      setEmail(user.email ?? "");
      setPhone(user.user_metadata?.phone ?? "");
      setAddress(user.user_metadata?.address ?? "");
      setLoading(false);
    });
    return () => { active = false; };
  }, [navigate]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: email.trim(),
        data: { display_name: name.trim(), phone: phone.trim(), address: address.trim() },
      });
      if (error) throw error;
      toast.success("Dados atualizados. Se você alterou o e-mail, confirme a alteração na sua caixa de entrada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar seus dados.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) { toast.error("Não foi possível sair da conta."); return; }
    navigate({ to: "/auth" });
  }

  if (loading) return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-xl px-6 py-24 text-muted-foreground">Carregando sua conta…</main><SiteFooter /></div>;

  return <div className="min-h-screen">
    <SiteHeader />
    <main className="mx-auto max-w-xl px-6 pb-20 pt-24">
      <p className="eyebrow">Seu espaço pessoal</p>
      <h1 className="mt-2 text-4xl text-foreground">Configurações da conta</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">Atualize seus dados para manter suas informações de contato e entrega em dia.</p>
      <form onSubmit={save} className="mt-8 space-y-4">
        <label className="block text-sm text-muted-foreground">Nome
          <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" className="mt-1 w-full border bg-transparent px-4 py-3 text-foreground focus:border-primary focus:outline-none" />
        </label>
        <label className="block text-sm text-muted-foreground">E-mail
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="mt-1 w-full border bg-transparent px-4 py-3 text-foreground focus:border-primary focus:outline-none" />
        </label>
        <label className="block text-sm text-muted-foreground">Telefone
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" className="mt-1 w-full border bg-transparent px-4 py-3 text-foreground focus:border-primary focus:outline-none" />
        </label>
        <label className="block text-sm text-muted-foreground">Endereço de entrega
          <textarea value={address} onChange={e => setAddress(e.target.value)} autoComplete="street-address" rows={3} className="mt-1 w-full border bg-transparent px-4 py-3 text-foreground focus:border-primary focus:outline-none" />
        </label>
        <button type="submit" disabled={saving} className="btn-gold w-full justify-center">{saving ? "Salvando…" : "Salvar alterações"}</button>
      </form>
      <div className="mt-10 border-t border-primary/20 pt-6">
        <h2 className="text-xl text-foreground">Sessão</h2>
        <p className="mt-2 text-sm text-muted-foreground">Saia para entrar em outra conta ou criar um novo cadastro neste dispositivo.</p>
        <button type="button" onClick={logout} className="mt-4 border border-primary/40 px-5 py-3 text-sm text-foreground hover:bg-primary/10">Sair da conta / trocar de conta</button>
      </div>
    </main>
    <SiteFooter />
  </div>;
}
