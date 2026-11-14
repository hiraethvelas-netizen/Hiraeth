import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPostLoginDestination, getSafeInternalRedirect } from "@/lib/auth-routing";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { HOUSES, type HouseId } from "@/lib/house-cup";
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
  const [nfcToken, setNfcToken] = useState("");
  useEffect(() => {
    // O primeiro HTML deve ser igual no servidor e no navegador.
    setNfcToken(window.sessionStorage.getItem("hiraeth:nfc:pending-token") ?? "");
  }, []);
  const verifiedPortalFlow = source === "portal-nfc" && /^[0-9a-f]{64}$/.test(nfcToken);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requested = getSafeInternalRedirect(redirect);
  const isAdminLogin = requested === "/admin";
  const [welcomePresentation,setWelcomePresentation] = useState<{title:string;message:string;buttonText:string}|null>(null);

  async function showCustomerWelcome() {
    try {
      const {data,error} = await (supabase as any).from("site_content").select("value").eq("key","customer-welcome-message").maybeSingle();
      if(error){console.warn("Não foi possível carregar a mensagem de boas-vindas:",error);return false;}
      const settings = data?.value ?? {};
      if(settings.enabled !== true) return false;
      setWelcomePresentation({
        title: typeof settings.title === "string" && settings.title.trim() ? settings.title : "A chama da Hiraeth te recebe",
        message: typeof settings.message === "string" ? settings.message : "Que bom ter você aqui. Este é o seu espaço para encontrar histórias, aromas e lembranças que merecem permanecer acesas.",
        buttonText: typeof settings.buttonText === "string" && settings.buttonText.trim() ? settings.buttonText : "Seguir para o início",
      });
      return true;
    } catch(error) {
      console.warn("Não foi possível carregar a mensagem de boas-vindas:",error);
      return false;
    }
  }

  // O cadastro no portal registra uma intenção; a permissão só é concedida pelo
  // código NFC único validado na RPC, nunca pelo query string ou user_metadata.
  async function activateNfcIfPresent(user: { id: string; user_metadata?: Record<string, unknown> }) {
    const pending = user.user_metadata?.["hiraeth_nfc_pending_token"];
    const token = typeof pending === "string" && /^[0-9a-f]{64}$/.test(pending)
      ? pending : /^[0-9a-f]{64}$/.test(nfcToken) ? nfcToken : "";
    if (!token) return { activated: false, unsure: false };
    const { data: success, error: claimError } = await (supabase as any)
      .rpc("claim_house_nfc_access_code", { p_token: token });
    if (claimError || success !== true) {
      toast.error("Não foi possível validar este NFC. Confira se o código já foi usado.");
      return { activated: false, unsure: false };
    }
    const choice = user.user_metadata?.["hiraeth_nfc_house_pending"];
    const chosen = HOUSES.some(h => h.id === choice) ? choice as HouseId
      : choice === "unknown" ? null : verifiedPortalFlow ? houseChoice === "unknown" ? null : houseChoice : null;
    const { error: houseError } = await (supabase as any).from("member_houses")
      .upsert({ user_id: user.id, house: chosen, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (houseError) toast.error("NFC ativado, mas não foi possível salvar sua casa.");
    else toast.success("Seu acesso NFC exclusivo foi ativado!");
    window.sessionStorage.removeItem("hiraeth:nfc:pending-token");
    // Não deixar a credencial do NFC perpetuamente na sessão de autenticação.
    await supabase.auth.updateUser({ data: {
      hiraeth_nfc_pending_token: null, hiraeth_nfc_house_pending: null,
    } });
    return { activated: true, unsure: chosen === null };
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

        const nfcResult = !isAdmin ? await activateNfcIfPresent(data.user) : { activated: false, unsure: false };
        if (nfcResult.activated) {
          await navigate({ to: (nfcResult.unsure ? "/produto/a-seletora" : requested) as never });
          return;
        }
        const firstWelcome = data.user.user_metadata?.["hiraeth_welcome_pending"] === true;
        if (firstWelcome) {
          const { error: metadataError } = await supabase.auth.updateUser({ data: { hiraeth_welcome_pending: false } });
          if (metadataError) console.warn("Não foi possível registrar a primeira saudação da conta.", metadataError);
        }
        if (isAdmin) {
          toast.success("Bem-vinda à Administração Hiraeth!", {
            description: "Seu painel está pronto. Que bom ter você de volta aos bastidores da nossa chama.",
            duration: 7000,
          });
          await navigate({ to: getPostLoginDestination(requested, isAdmin) as never });
          return;
        }
        if (await showCustomerWelcome()) return;
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
              ...(verifiedPortalFlow ? { hiraeth_nfc_pending_token: nfcToken, hiraeth_nfc_house_pending: houseChoice } : {}),
            },
            emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(requested === "/admin" ? "/inicio" : requested)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          if (verifiedPortalFlow && data.user) {
            const nfcResult = await activateNfcIfPresent(data.user);
            if (nfcResult.activated) {
              await navigate({ to: (nfcResult.unsure ? "/produto/a-seletora" : requested) as never });
              return;
            }
          }
          const { error: metadataError } = await supabase.auth.updateUser({ data: { hiraeth_welcome_pending: false } });
          if (metadataError) console.warn("Não foi possível registrar a primeira saudação da conta.", metadataError);
          if (await showCustomerWelcome()) return;
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
      {welcomePresentation && <div className="fixed inset-0 z-[200] grid min-h-screen place-items-center overflow-y-auto bg-[#0d160f]/95 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Mensagem de boas-vindas">
        <section className="relative my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-[#b18a4b]/70 bg-[radial-gradient(ellipse_at_top,rgba(190,151,83,0.24),transparent_48%),linear-gradient(135deg,#17251c_0%,#263d2c_55%,#101a14_100%)] px-6 py-12 text-center text-[#f7efda] shadow-[0_25px_90px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.08)] sm:px-14 sm:py-20">
          <div className="pointer-events-none absolute inset-3 rounded-xl border border-[#c6a66a]/25 sm:inset-5"/>
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[.35em] text-[#d7bd83] sm:text-xs">Onde a Chama Acesa te Espera</p>
            <div className="my-6 text-4xl text-[#d7bd83]">✧</div>
            <h1 className="mx-auto max-w-3xl font-display text-4xl leading-tight sm:text-6xl">{welcomePresentation.title}</h1>
            <p className="mx-auto mt-7 max-w-2xl whitespace-pre-wrap text-sm leading-8 text-[#eee4ce] sm:text-lg sm:leading-9">{welcomePresentation.message}</p>
            <button type="button" onClick={() => {setWelcomePresentation(null);void navigate({to:"/inicio" as never});}} className="mt-10 min-h-14 rounded-full border border-[#e3c987] bg-[#d7bd83] px-10 py-4 text-xs font-semibold uppercase tracking-[.18em] text-[#1e2a20] shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition hover:scale-[1.02] hover:bg-[#ead6a5]">{welcomePresentation.buttonText}</button>
          </div>
        </section>
      </div>}
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
          {mode === "signup" && verifiedPortalFlow && <fieldset className="rounded-xl border border-[#a7afd5]/70 bg-[#101b43] p-4 text-[#faf8ff]">
            <legend className="px-2 font-display text-xl text-[#f4e4bd]">Escolha sua casa</legend>
            <p className="mb-3 text-xs leading-5 text-[#e3e7ff]">Seu selinho será ativado depois da validação do NFC e da confirmação da conta.</p>
            <div className="grid grid-cols-2 gap-2">
              {HOUSES.map(house => <label key={house.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs ${houseChoice === house.id ? "border-[#f5e1a6] bg-[#2e4177]" : "border-[#8996c4]"}`}>
                <input type="radio" name="nfc-house" checked={houseChoice === house.id} onChange={() => setHouseChoice(house.id)} />
                <span>{house.animal} {house.label}</span>
              </label>)}
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-[#8996c4] p-3 text-xs">
              <input type="radio" name="nfc-house" checked={houseChoice === "unknown"} onChange={() => setHouseChoice("unknown")} />
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
