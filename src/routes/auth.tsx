import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getPostLoginDestination, getSafeInternalRedirect } from "@/lib/auth-routing";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { HOUSES, HOUSE_CHANGED_EVENT, type HouseId } from "@/lib/house-cup";
import { toast } from "sonner";

type Search = { redirect?: string | undefined; mode?: string | undefined; source?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
    mode: search["mode"] === "signup" ? "signup" : undefined,
    source: search["source"] === "portal-nfc" ? "portal-nfc" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Hiraeth" },
      { name: "description", content: "Acesse sua conta Hiraeth ou crie uma nova." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect, mode: initialMode, source } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialMode === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [name, setName] = useState("");
  const [houseChoice, setHouseChoice] = useState<HouseId | "unknown">("unknown");
  const fromNfcPortal = source === "portal-nfc";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requested = getSafeInternalRedirect(redirect);
  const isAdminLogin = requested === "/admin";

  // Com confirmação de e-mail, a escolha fica pendente até a primeira sessão.
  async function persistSignupHouse(
    user: { id: string; user_metadata?: Record<string, unknown> },
    immediateChoice?: HouseId | "unknown",
  ): Promise<{ pending: boolean; unsure: boolean; error: boolean }> {
    const metadata = user.user_metadata ?? {};
    const pending = immediateChoice !== undefined || metadata["hiraeth_house_setup_pending"] === true;
    if (!pending) return { pending: false, unsure: false, error: false };
    const requestedChoice = immediateChoice ?? metadata["hiraeth_house_pending"];
    const house = HOUSES.find(item => item.id === requestedChoice)?.id ?? null;
    const { error: saveError } = await (supabase as any).from("member_houses")
      .upsert({ user_id: user.id, house, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (saveError) {
      console.warn("Não foi possível salvar a escolha de casa.", saveError);
      return { pending: true, unsure: house === null, error: true };
    }
    const { error: metadataError } = await supabase.auth.updateUser({ data: {
      hiraeth_house_setup_pending: null, hiraeth_house_pending: null,
    } });
    if (metadataError) console.warn("Não foi possível encerrar a escolha de casa.", metadataError);
    window.dispatchEvent(new Event(HOUSE_CHANGED_EVENT));
    return { pending: true, unsure: house === null, error: false };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (mode === "login") {
        localStorage.setItem("hiraeth-remember-session", rememberSession ? "true" : "false");
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const userId = data.user?.id;
        if (!userId) throw new Error("Não foi possível identificar a conta autenticada.");
        const { data: adminRole, error: roleError } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });
        const isAdmin = !roleError && adminRole === true;
        if (isAdminLogin && !isAdmin) {
          await supabase.auth.signOut();
          setError("Esta área é reservada à administração da Hiraeth. Entre com a conta administrativa autorizada.");
          return;
        }

        if (!isAdmin) {
          const houseResult = await persistSignupHouse(data.user);
          if (houseResult.error) {
            setError("Sua conta foi criada, mas não conseguimos salvar sua casa. Tente entrar novamente.");
            return;
          }
          if (houseResult.pending && houseResult.unsure) {
            await navigate({ to: "/produto/a-seletora" as never });
            return;
          }
        }
        const firstWelcome = data.user.user_metadata?.["hiraeth_welcome_pending"] === true;
        if (isAdmin) {
          toast.success("Bem-vinda à Administração Hiraeth!", {
            description: "Seu painel está pronto. Que bom ter você de volta aos bastidores da nossa chama.",
            duration: 7000,
          });
          await navigate({ to: getPostLoginDestination(requested, isAdmin) as never });
          return;
        }
        if (firstWelcome) {
          toast.success("Que bom ter você por aqui!", {
            description: "Sua primeira chama na Hiraeth está acesa. Seja muito bem-vinda ao nosso círculo.",
            duration: 7000,
          });
        } else {
          toast.success("Bem-vinda de volta à Hiraeth!", {
            description: "Sua estante e seus universos continuam esperando por você.",
            duration: 7000,
          });
        }
        await navigate({ to: getPostLoginDestination(requested, isAdmin) as never });
        return;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: name, hiraeth_welcome_pending: true,
              hiraeth_house_setup_pending: true, hiraeth_house_pending: houseChoice,
            },
            emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(requested === "/admin" ? "/inicio" : requested)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          if (data.user) {
            const houseResult = await persistSignupHouse(data.user, houseChoice);
            if (houseResult.error) {
              setError("A conta foi criada, mas não conseguimos salvar sua casa. Tente entrar novamente.");
              return;
            }
            if (houseResult.unsure) {
              await navigate({ to: "/produto/a-seletora" as never });
              return;
            }
          }
          toast.success("Que bom ter você por aqui!", {
            description: "Sua primeira chama na Hiraeth está acesa. Seja muito bem-vinda ao nosso círculo.",
            duration: 7000,
          });
          await navigate({ to: getPostLoginDestination(requested, false) as never });
          return;
        }
        toast.success("Bem-vinda à Hiraeth!", {
          description: "Seu cadastro foi recebido. Confirme seu e-mail para entrar e começar a montar sua estante de histórias.",
          duration: 7000,
        });
        setMode("login");
        setMessage("Sua conta foi criada. Confira seu e-mail para confirmar o acesso. No primeiro login, teremos uma mensagem especial de boas-vindas para você.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage("Enviamos um link de recuperação para seu e-mail.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 pb-20 pt-32">
        <p className="eyebrow">{isAdminLogin ? "Acesso reservado" : "Círculo do Fogo"}</p>
        <h1 className="mt-2 text-4xl text-foreground">
          {isAdminLogin ? "Administração Hiraeth" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha"}
        </h1>
        {isAdminLogin && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Entre com as credenciais da conta administrativa autorizada.</p>}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <input
              type="text"
              required
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          )}
          {mode === "signup" && <fieldset className="rounded-xl border border-[#a7afd5]/70 bg-[#101b43] p-4 text-[#faf8ff]">
            <legend className="px-2 font-display text-xl text-[#f4e4bd]">Escolha sua casa</legend>
            <p className="mb-3 text-xs leading-5 text-[#e3e7ff]">{fromNfcPortal ? "Bem-vinda pelo portal! " : ""}Escolha sua casa para receber um selo ao lado do nome na comunidade. Não é necessário ter um NFC.</p>
            <div className="grid grid-cols-2 gap-2">
              {HOUSES.map(house => <label key={house.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs ${houseChoice === house.id ? "border-[#f5e1a6] bg-[#2e4177]" : "border-[#8996c4]"}`}>
                <input type="radio" name="house" checked={houseChoice === house.id} onChange={() => setHouseChoice(house.id)} />
                <span>{house.animal} {house.label}</span>
              </label>)}
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-[#8996c4] p-3 text-xs">
              <input type="radio" name="house" checked={houseChoice === "unknown"} onChange={() => setHouseChoice("unknown")} />
              Não sei minha casa — descobrir com a Vela Seletora
            </label>
          </fieldset>}
          <input
            type="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {mode !== "forgot" && (
            <>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="Senha (mín. 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border bg-transparent px-4 py-3 pr-20 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 px-4 text-xs text-muted-foreground hover:text-primary" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {mode === "login" && <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={rememberSession} onChange={(e) => setRememberSession(e.target.checked)} className="accent-primary" />Permanecer conectado neste dispositivo</label>}
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-primary">{message}</p>}
          <button type="submit" disabled={loading} className="btn-gold w-full justify-center">
            {loading
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : mode === "signup"
                  ? "Criar conta"
                  : "Enviar link"}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
          {mode === "login" && (
            <>
              <button onClick={() => setMode("forgot")} className="block w-full hover:text-primary">
                Esqueci minha senha
              </button>
              {!isAdminLogin && <button onClick={() => setMode("signup")} className="block w-full hover:text-primary">
                Ainda não tenho conta
              </button>}
            </>
          )}
          {mode !== "login" && (
            <button onClick={() => setMode("login")} className="block w-full hover:text-primary">
              Já tenho conta
            </button>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
