import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { toast } from "sonner";

type DeliveryAddress = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
  complement: string;
};

const emptyAddress: DeliveryAddress = {
  cep: "", street: "", neighborhood: "", city: "", state: "", number: "", complement: "",
};

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações da conta — Hiraeth" }] }),
  component: AccountSettings,
});

function AccountSettings() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<DeliveryAddress>(emptyAddress);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookingUpCep, setLookingUpCep] = useState(false);

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
      const savedAddress = user.user_metadata?.address;
      if (savedAddress && typeof savedAddress === "object") {
        setAddress({ ...emptyAddress, ...savedAddress });
      } else if (typeof savedAddress === "string" && savedAddress.trim()) {
        setAddress({ ...emptyAddress, street: savedAddress });
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [navigate]);

  async function lookupCep() {
    const cep = address.cep.replace(/\\D/g, "");
    if (cep.length !== 8) {
      toast.error("Digite um CEP válido com 8 números.");
      return;
    }
    setLookingUpCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error("Não foi possível consultar o CEP.");
      const result = await response.json();
      if (result.erro) {
        toast.error("CEP não encontrado. Confira os números e tente novamente.");
        return;
      }
      setAddress(current => ({
        ...current,
        street: result.logradouro ?? current.street,
        neighborhood: result.bairro ?? current.neighborhood,
        city: result.localidade ?? current.city,
        state: result.uf ?? current.state,
      }));
      toast.success("Endereço encontrado. Confira e complete os dados.");
    } catch {
      toast.error("Não foi possível buscar o CEP agora. Tente novamente.");
    } finally {
      setLookingUpCep(false);
    }
  }

  function updateAddress<K extends keyof DeliveryAddress>(key: K, value: DeliveryAddress[K]) {
    setAddress(current => ({ ...current, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: email.trim(),
        data: {
          display_name: name.trim(),
          phone: phone.trim(),
          address: Object.fromEntries(Object.entries(address).map(([key, value]) => [key, value.trim()])),
        },
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

  const fieldClass = "mt-1 w-full border border-primary/25 bg-card/60 px-4 py-3 text-base text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30";
  const labelClass = "block text-sm text-muted-foreground";

  if (loading) return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-16 text-muted-foreground">Carregando sua conta…</main><SiteFooter /></div>;

  return <div className="min-h-screen">
    <SiteHeader />
    <main className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-8 sm:pt-12">
      <header className="mb-8 border-l-4 border-primary pl-5 text-left sm:pl-7">
        <p className="eyebrow text-base">Seu espaço pessoal</p>
        <h1 className="mt-1 text-4xl leading-tight text-foreground sm:text-5xl">Configurações da conta</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">Seus dados, do seu jeito. Mantenha suas informações de contato e entrega sempre em dia.</p>
      </header>

      <form onSubmit={save} className="space-y-8">
        <section className="border border-primary/20 bg-card/40 p-5 sm:p-7">
          <h2 className="mb-5 text-2xl text-foreground">Dados pessoais</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>Nome completo
              <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" className={fieldClass} />
            </label>
            <label className={labelClass}>E-mail
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className={fieldClass} />
            </label>
            <label className={labelClass + " sm:col-span-2"}>Telefone
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" placeholder="(00) 00000-0000" className={fieldClass} />
            </label>
          </div>
        </section>

        <section className="border border-primary/20 bg-card/40 p-5 sm:p-7">
          <h2 className="text-2xl text-foreground">Endereço de entrega</h2>
          <p className="mb-5 mt-2 text-sm leading-6 text-muted-foreground">Informe o CEP para preencher rua, bairro e cidade automaticamente. Depois, adicione o número e o complemento.</p>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className={labelClass + " sm:max-w-xs sm:flex-1"}>CEP
              <input value={address.cep} onChange={e => updateAddress("cep", e.target.value.replace(/[^0-9-]/g, "").slice(0, 9))} onBlur={() => { if (address.cep.replace(/\\D/g, "").length === 8) void lookupCep(); }} autoComplete="postal-code" inputMode="numeric" placeholder="00000-000" className={fieldClass} />
            </label>
            <button type="button" onClick={() => void lookupCep()} disabled={lookingUpCep} className="min-h-12 border border-primary px-5 py-3 text-sm text-foreground transition hover:bg-primary/10 disabled:opacity-50">{lookingUpCep ? "Buscando…" : "Buscar CEP"}</button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass + " sm:col-span-2"}>Rua / Avenida
              <input value={address.street} onChange={e => updateAddress("street", e.target.value)} autoComplete="address-line1" className={fieldClass} />
            </label>
            <label className={labelClass}>Número
              <input value={address.number} onChange={e => updateAddress("number", e.target.value)} autoComplete="address-line2" placeholder="Número da casa" className={fieldClass} />
            </label>
            <label className={labelClass}>Complemento
              <input value={address.complement} onChange={e => updateAddress("complement", e.target.value)} placeholder="Apto, bloco, casa fundos…" className={fieldClass} />
            </label>
            <label className={labelClass}>Bairro
              <input value={address.neighborhood} onChange={e => updateAddress("neighborhood", e.target.value)} autoComplete="address-level3" className={fieldClass} />
            </label>
            <label className={labelClass}>Cidade
              <input value={address.city} onChange={e => updateAddress("city", e.target.value)} autoComplete="address-level2" className={fieldClass} />
            </label>
            <label className={labelClass + " sm:col-span-2"}>Estado (UF)
              <input value={address.state} onChange={e => updateAddress("state", e.target.value.toUpperCase().slice(0, 2))} autoComplete="address-level1" maxLength={2} placeholder="SC" className={fieldClass} />
            </label>
          </div>
        </section>

        <button type="submit" disabled={saving} className="btn-gold w-full justify-center py-4 text-base">{saving ? "Salvando…" : "Salvar alterações"}</button>
      </form>

      <section className="mt-10 border-t border-primary/20 pt-7">
        <h2 className="text-2xl text-foreground">Sessão</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Saia para entrar em outra conta ou criar um novo cadastro neste dispositivo.</p>
        <button type="button" onClick={logout} className="mt-4 border border-primary/40 px-5 py-3 text-sm text-foreground transition hover:bg-primary/10">Sair da conta / trocar de conta</button>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
